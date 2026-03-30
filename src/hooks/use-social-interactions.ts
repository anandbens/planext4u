/**
 * Database-driven social interaction hooks
 * Handles likes, comments, follows, bookmarks via Supabase
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── LIKES ───────────────────────────────────
export function usePostLike(postId: string) {
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const userId = customerUser?.id;

  const { data: isLiked = false } = useQuery({
    queryKey: ['social-like', postId, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from('social_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!userId && !!postId,
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
      if (!userId) { toast.error("Please login"); return; }
      if (isLiked) {
        await supabase.from('social_likes').delete().eq('post_id', postId).eq('user_id', userId);
      } else {
        await supabase.from('social_likes').insert({ post_id: postId, user_id: userId });
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
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const userId = customerUser?.id;

  const { data: isSaved = false } = useQuery({
    queryKey: ['social-bookmark', postId, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from('social_bookmarks')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!userId && !!postId,
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (!userId) { toast.error("Please login"); return; }
      if (isSaved) {
        await supabase.from('social_bookmarks').delete().eq('post_id', postId).eq('user_id', userId);
        toast.success("Removed from saved");
      } else {
        await supabase.from('social_bookmarks').insert({ post_id: postId, user_id: userId });
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
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const userId = customerUser?.id;

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['social-comments', postId],
    queryFn: async () => {
      // Get top-level comments
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

      // Get replies
      const commentIds = topLevel.map(c => c.id);
      const { data: replies } = await supabase
        .from('social_comments')
        .select('*')
        .in('parent_id', commentIds)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      // Get like status for current user
      let userLikes: string[] = [];
      if (userId) {
        const allIds = [...commentIds, ...(replies?.map(r => r.id) || [])];
        const { data: likes } = await supabase
          .from('social_comment_likes')
          .select('comment_id')
          .eq('user_id', userId)
          .in('comment_id', allIds);
        userLikes = likes?.map(l => l.comment_id) || [];
      }

      return topLevel.map(c => ({
        ...c,
        isLiked: userLikes.includes(c.id),
        replies: (replies || [])
          .filter(r => r.parent_id === c.id)
          .map(r => ({ ...r, isLiked: userLikes.includes(r.id) })),
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
      if (!userId) { toast.error("Please login"); return; }
      await supabase.from('social_comments').insert({
        post_id: postId,
        user_id: userId,
        content: text,
        parent_id: parentId || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-comments', postId] });
      qc.invalidateQueries({ queryKey: ['social-comment-count', postId] });
      toast.success("Comment posted");
    },
  });

  const toggleCommentLike = useMutation({
    mutationFn: async (commentId: string) => {
      if (!userId) return;
      const { data: existing } = await supabase
        .from('social_comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        await supabase.from('social_comment_likes').delete().eq('id', existing.id);
      } else {
        await supabase.from('social_comment_likes').insert({ comment_id: commentId, user_id: userId });
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
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const userId = customerUser?.id;

  const { data: isFollowing = false } = useQuery({
    queryKey: ['social-follow', targetUserId, userId],
    queryFn: async () => {
      if (!userId || !targetUserId || userId === targetUserId) return false;
      const { data } = await supabase
        .from('social_follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', targetUserId)
        .eq('status', 'active')
        .maybeSingle();
      return !!data;
    },
    enabled: !!userId && !!targetUserId,
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!userId) { toast.error("Please login"); return; }
      if (isFollowing) {
        await supabase.from('social_follows').delete().eq('follower_id', userId).eq('following_id', targetUserId);
        toast.success("Unfollowed");
      } else {
        await supabase.from('social_follows').insert({ follower_id: userId, following_id: targetUserId, status: 'active' });
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
  const { customerUser } = useAuth();

  return useQuery({
    queryKey: ['social-feed', mode],
    queryFn: async () => {
      let query = supabase
        .from('social_posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20);

      if (mode === 'following' && customerUser?.id) {
        const { data: followings } = await supabase
          .from('social_follows')
          .select('following_id')
          .eq('follower_id', customerUser.id)
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
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check this out on P4U Social', text: text || '', url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  }, []);
}

// ─── REPOST ──────────────────────────────────
export function useRepost() {
  const { customerUser } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!customerUser?.id) { toast.error("Please login"); return; }
      // Create a repost entry in social_posts
      const { data: original } = await supabase
        .from('social_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (!original) throw new Error('Post not found');

      await supabase.from('social_posts').insert({
        user_id: customerUser.id,
        content: original.content,
        media_urls: original.media_urls,
        post_type: 'repost',
        repost_of: postId,
        status: 'published',
      });
      toast.success("Reposted!");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-feed'] });
    },
  });
}
