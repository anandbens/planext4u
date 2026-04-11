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
        await supabase.from('social_likes').insert({ post_id: postId, user_id: uid });
        awardPoints(uid, 'post_like_points', 'Points for liking a post');
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

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// ─── SHARE ───────────────────────────────────
export function useSharePost() {
  return useCallback(async (postId: string, text?: string) => {
    const url = `${window.location.origin}/app/social/post/${postId}`;
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
      if (uid) awardPoints(uid, 'post_share_points', 'Points for sharing a post');
    }
  }, []);
}

// ─── REPOST ──────────────────────────────────
export function useRepost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const uid = await getAuthUserId();
      if (!uid) { toast.error("Please login"); return; }
      const { data: original } = await supabase
        .from('social_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (!original) throw new Error('Post not found');

      await supabase.from('social_posts').insert({
        user_id: uid,
        caption: original.caption,
        media: original.media,
        post_type: 'repost',
        is_repost: true,
        original_post_id: postId,
        status: 'published',
      });
      toast.success("Reposted!");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-feed'] });
    },
  });
}
