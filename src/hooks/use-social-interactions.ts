/**
 * Database-driven social interaction hooks
 * Handles likes, comments, follows, bookmarks via Supabase
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { awardPoints } from "@/lib/award-points";

/**
 * Get the auth UUID (not CUS-xxx) for social table operations.
 * Social tables use UUID references, not customer IDs.
 */
async function getAuthUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

function useAuthUserId() {
  const { data: authId } = useQuery({
    queryKey: ['auth-user-id'],
    queryFn: async () => {
      const id = await getAuthUserId();
      return id;
    },
    staleTime: 5 * 60 * 1000,
  });
  return authId || null;
}

// ─── LIKES ───────────────────────────────────
export function usePostLike(postId: string) {
  const authUserId = useAuthUserId();
  const qc = useQueryClient();

  const { data: isLiked = false } = useQuery({
    queryKey: ['social-like', postId, authUserId],
    queryFn: async () => {
      if (!authUserId) return false;
      const { data } = await supabase
        .from('social_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', authUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!authUserId && !!postId,
  });

  const { data: likeCount = 0 } = useQuery({
    queryKey: ['social-like-count', postId],
    queryFn: async () => {
      const { count } = await supabase
        .from('social_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      return count || 0;
    },
    enabled: !!postId,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      const uid = await getAuthUserId();
      if (!uid) { toast.error("Please login"); return; }
      if (isLiked) {
        await supabase.from('social_likes').delete().eq('post_id', postId).eq('user_id', uid);
      } else {
        // DB trigger awards 1 point to the post author (deduped by unique (user_id, post_id))
        await supabase.from('social_likes').insert({ post_id: postId, user_id: uid });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-like', postId] });
      qc.invalidateQueries({ queryKey: ['social-like-count', postId] });
    },
  });

  return { isLiked, likeCount, toggleLike: toggleLike.mutate };
}

// ─── BOOKMARKS ───────────────────────────────
export function usePostBookmark(postId: string) {
  const authUserId = useAuthUserId();
  const qc = useQueryClient();

  const { data: isSaved = false } = useQuery({
    queryKey: ['social-bookmark', postId, authUserId],
    queryFn: async () => {
      if (!authUserId) return false;
      const { data } = await supabase
        .from('social_bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', authUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!authUserId && !!postId,
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      const uid = await getAuthUserId();
      if (!uid) { toast.error("Please login"); return; }
      if (isSaved) {
        await supabase.from('social_bookmarks').delete().eq('post_id', postId).eq('user_id', uid);
        toast.success("Removed from saved");
      } else {
        await supabase.from('social_bookmarks').insert({ post_id: postId, user_id: uid });
        toast.success("Post saved");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-bookmark', postId] });
    },
  });

  return { isSaved, toggleBookmark: toggleBookmark.mutate };
}

// ─── COMMENTS ────────────────────────────────
export function usePostComments(postId: string) {
  const authUserId = useAuthUserId();
  const qc = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['social-comments', postId],
    queryFn: async () => {
      const { data: topLevel } = await supabase
        .from('social_comments')
        .select('*')
        .eq('post_id', postId)
        .is('parent_id', null)
        .eq('status', 'active')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (!topLevel?.length) return [];

      const commentIds = topLevel.map(c => c.id);
      const { data: replies } = await supabase
        .from('social_comments')
        .select('*')
        .in('parent_id', commentIds)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      const allComments = [...topLevel, ...(replies || [])];
      const userIds = Array.from(new Set(allComments.map(c => c.user_id).filter(Boolean)));
      const { data: profiles } = userIds.length
        ? await supabase
            .from('social_profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', userIds)
        : { data: [] as any[] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      let userLikes: string[] = [];
      const uid = await getAuthUserId();
      if (uid) {
        const allIds = [...commentIds, ...(replies?.map(r => r.id) || [])];
        const { data: likes } = await supabase
          .from('social_comment_likes')
          .select('comment_id')
          .eq('user_id', uid)
          .in('comment_id', allIds);
        userLikes = likes?.map(l => l.comment_id) || [];
      }

      const enrichComment = (comment: any) => {
        const profile = profileMap.get(comment.user_id);
        return {
          ...comment,
          username: profile?.username || 'user',
          display_name: profile?.display_name || profile?.username || 'user',
          avatar_url: profile?.avatar_url || '',
          isLiked: userLikes.includes(comment.id),
        };
      };

      return topLevel.map(c => ({
        ...enrichComment(c),
        replies: (replies || []).filter(r => r.parent_id === c.id).map(enrichComment),
      }));
    },
    enabled: !!postId,
  });

  const { data: commentCount = 0 } = useQuery({
    queryKey: ['social-comment-count', postId],
    queryFn: async () => {
      const { count } = await supabase
        .from('social_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('status', 'active');
      return count || 0;
    },
    enabled: !!postId,
  });

  const addComment = useMutation({
    mutationFn: async ({ text, parentId }: { text: string; parentId?: string }) => {
      const uid = await getAuthUserId();
      if (!uid) { toast.error("Please login"); return; }
      const { error } = await supabase.from('social_comments').insert({
        post_id: postId,
        user_id: uid,
        content: text,
        parent_id: parentId || null,
      });
      if (error) {
        console.error('Comment insert error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-comments', postId] });
      qc.invalidateQueries({ queryKey: ['social-comment-count', postId] });
      toast.success("Comment posted");
    },
    onError: (err: any) => {
      toast.error("Failed to post comment");
    },
  });

  const toggleCommentLike = useMutation({
    mutationFn: async (commentId: string) => {
      const uid = await getAuthUserId();
      if (!uid) return;
      const { data: existing } = await supabase
        .from('social_comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', uid)
        .maybeSingle();

      if (existing) {
        await supabase.from('social_comment_likes').delete().eq('id', existing.id);
      } else {
        await supabase.from('social_comment_likes').insert({ comment_id: commentId, user_id: uid });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-comments', postId] });
    },
  });

  return { comments, commentCount, isLoading, addComment: addComment.mutate, toggleCommentLike: toggleCommentLike.mutate };
}

// ─── FOLLOWS ─────────────────────────────────
export function useFollow(targetUserId: string) {
  const authUserId = useAuthUserId();
  const qc = useQueryClient();

  const { data: isFollowing = false } = useQuery({
    queryKey: ['social-follow', targetUserId, authUserId],
    queryFn: async () => {
      if (!authUserId || !targetUserId || authUserId === targetUserId) return false;
      const { data } = await supabase
        .from('social_follows')
        .select('id')
        .eq('follower_id', authUserId)
        .eq('following_id', targetUserId)
        .eq('status', 'active')
        .maybeSingle();
      return !!data;
    },
    enabled: !!authUserId && !!targetUserId,
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      const uid = await getAuthUserId();
      if (!uid) { toast.error("Please login"); return; }
      if (isFollowing) {
        await supabase.from('social_follows').delete().eq('follower_id', uid).eq('following_id', targetUserId);
        toast.success("Unfollowed");
      } else {
        await supabase.from('social_follows').insert({ follower_id: uid, following_id: targetUserId, status: 'active' });
        toast.success("Following");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-follow', targetUserId] });
      qc.invalidateQueries({ queryKey: ['social-follower-count'] });
    },
  });

  return { isFollowing, toggleFollow: toggleFollow.mutate };
}

// ─── POSTS (feed) ────────────────────────────
export function useSocialFeed(mode: 'following' | 'for_you' = 'for_you') {
  const authUserId = useAuthUserId();

  return useQuery({
    queryKey: ['social-feed', mode],
    queryFn: async () => {
      let query = supabase
        .from('social_posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20);

      if (mode === 'following' && authUserId) {
        const { data: followings } = await supabase
          .from('social_follows')
          .select('following_id')
          .eq('follower_id', authUserId)
          .eq('status', 'active');

        const ids = followings?.map(f => f.following_id) || [];
        if (ids.length > 0) {
          query = query.in('user_id', ids);
        }
      }

      const { data: rawData, error } = await query;
      if (error) throw error;

      // Filter out posts whose author profile no longer exists
      const authorIds = Array.from(new Set((rawData || []).map((p: any) => p.user_id).filter(Boolean)));
      let existingAuthors = new Set<string>();
      if (authorIds.length > 0) {
        const { data: profs } = await supabase
          .from('social_profiles')
          .select('user_id')
          .in('user_id', authorIds);
        existingAuthors = new Set((profs || []).map((p: any) => p.user_id));
      }
      const data = (rawData || []).filter((p: any) => existingAuthors.has(p.user_id));

      // Hydrate repost posts with the original author profile + caption
      const reposts = (data || []).filter((p: any) => p.is_repost && p.original_post_id);
      const originalIds = Array.from(new Set(reposts.map((p: any) => p.original_post_id)));
      let originalsMap = new Map<string, any>();
      if (originalIds.length > 0) {
        const { data: originals } = await supabase
          .from('social_posts')
          .select('id, user_id, caption, created_at')
          .in('id', originalIds);
        const ownerIds = Array.from(new Set((originals || []).map((o: any) => o.user_id)));
        const { data: ownerProfiles } = ownerIds.length
          ? await supabase
              .from('social_profiles')
              .select('user_id, username, display_name, avatar_url, is_verified')
              .in('user_id', ownerIds)
          : { data: [] as any[] };
        const ownerMap = new Map((ownerProfiles || []).map((p: any) => [p.user_id, p]));
        originalsMap = new Map(
          (originals || []).map((o: any) => [o.id, { ...o, owner: ownerMap.get(o.user_id) || null }])
        );
      }

      return (data || []).map((p: any) =>
        p.is_repost && p.original_post_id
          ? { ...p, original_post: originalsMap.get(p.original_post_id) || null }
          : p
      );
    },
  });
}

// ─── SHARE ───────────────────────────────────
export function useSharePost() {
  return useCallback(async (postId: string, text?: string) => {
    // Always use the published URL so links work across devices/platforms
    const publishedOrigin = 'https://www.planext4u.net';
    const webOrigin = window.location.origin;
    const origin = webOrigin.includes('localhost') || webOrigin.includes('capacitor://') ? publishedOrigin : webOrigin;
    const url = `${origin}/app/social/post/${postId}`;
    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check this out on P4U Social', text: text || '', url });
        shared = true;
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
      shared = true;
    }
    if (shared) {
      const uid = await getAuthUserId();
      if (uid) {
        // Record share (unique per user+post). DB trigger awards 1 pt to author.
        try {
          await supabase.from('social_shares').insert({ post_id: postId, user_id: uid } as any);
        } catch { /* duplicate share — ignore */ }
      }
    }
  }, []);
}

// ─── SHARE STORY ─────────────────────────────
// Story shares earn points only when the story author is a verified vendor.
export function useShareStory() {
  return useCallback(async (storyId: string, authorUserId: string, mediaUrl?: string) => {
    const publishedOrigin = 'https://www.planext4u.net';
    const webOrigin = window.location.origin;
    const origin = webOrigin.includes('localhost') || webOrigin.includes('capacitor://') ? publishedOrigin : webOrigin;
    const url = `${origin}/app/social/story/${storyId}`;
    let shared = false;
    if (navigator.share) {
      try { await navigator.share({ title: 'Check this story on P4U Social', url }); shared = true; }
      catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Story link copied");
      shared = true;
    }
    if (shared) {
      const uid = await getAuthUserId();
      if (uid && authorUserId) {
        // Check author is a vendor via user_roles
        const { data: role } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', authorUserId)
          .eq('role', 'vendor')
          .maybeSingle();
        if (role) {
          awardPoints(uid, 'vendor_story_share_points', "Points for sharing a vendor's story");
        }
      }
    }
  }, []);
}

// ─── REPOST ──────────────────────────────────
// Creates a NEW social_post with is_repost=true and original_post_id pointing to source.
// Awards points only if original post has tagged products.
export function useRepost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, note }: { postId: string; note?: string }) => {
      const uid = await getAuthUserId();
      if (!uid) { toast.error("Please login"); return; }

      const { data: original } = await supabase
        .from('social_posts')
        .select('id, user_id, caption, media, post_type, product_tags, hashtags')
        .eq('id', postId)
        .single();

      if (!original) throw new Error('Post not found');

      // Prevent duplicate reposts by the same user
      const { data: existing } = await supabase
        .from('social_posts')
        .select('id')
        .eq('user_id', uid)
        .eq('original_post_id', postId)
        .eq('is_repost', true)
        .maybeSingle();

      if (existing) {
        toast.info("You've already reposted this");
        return;
      }

      const repostId = crypto.randomUUID();
      await supabase.from('social_posts').insert({
        id: repostId,
        user_id: uid,
        post_type: original.post_type || 'post',
        caption: original.caption || '',
        media: original.media as any,
        product_tags: original.product_tags as any,
        hashtags: original.hashtags as any,
        is_repost: true,
        original_post_id: postId,
        repost_note: note?.trim() || null,
        status: 'published',
      } as any);

      // Award points only when the reposted post has tagged products
      const tags = Array.isArray(original.product_tags) ? original.product_tags as any[] : [];
      if (tags.length > 0) {
        awardPoints(uid, 'post_repost_points', 'Points for reposting a post with tagged products');
      }

      toast.success("Reposted! Your followers will see this in their feed.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-feed'] });
      qc.invalidateQueries({ queryKey: ['social-user-posts'] });
      qc.invalidateQueries({ queryKey: ['social-user-reposts'] });
    },
    onError: (err: any) => {
      console.error('Repost error:', err);
      toast.error("Failed to repost");
    },
  });
}

// ─── REPLY TO COMMENT ────────────────────────
// (addComment in usePostComments already supports parent_id; this is just a thin wrapper)
export function useReplyToComment(postId: string) {
  const { addComment } = usePostComments(postId);
  return useCallback((parentId: string, text: string) => {
    addComment({ text, parentId });
  }, [addComment]);
}

// ─── DELETE COMMENT ──────────────────────────────────
export function useDeleteComment(postId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const uid = await getAuthUserId();
      if (!uid) { toast.error("Please login"); return; }

      // We allow deletion if user is comment owner OR post owner
      // First try deleting as comment owner
      const { error } = await supabase
        .from('social_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-comments', postId] });
      qc.invalidateQueries({ queryKey: ['social-comment-count', postId] });
      toast.success("Comment deleted");
    },
    onError: () => {
      toast.error("Failed to delete comment");
    },
  });
}
