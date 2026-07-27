import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
// import { StatusVideoBackground } from '@/components/layout/StatusVideoBackground';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useForumPost,
  useForumComments,
  useCreateForumComment,
  useForumVote,
  useDeleteForumPost,
  useDeleteForumComment,
  type ForumComment,
} from '@/hooks/useForum';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getProxiedImageUrl } from '@/lib/api';
import {
  ArrowUp,
  ArrowDown,
  MessageCircle,
  Eye,
  ArrowLeft,
  Send,
  Trash2,
  AlertTriangle,
  Pin,
  Lock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function CommentCard({ comment, postId }: { comment: ForumComment; postId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const vote = useForumVote();
  const deleteComment = useDeleteForumComment();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const createComment = useCreateForumComment();
  const score = comment.upvotes - comment.downvotes;

  const handleVote = (voteType: 1 | -1) => {
    if (!user) {
      toast({ title: 'Veuillez vous connecter pour voter', variant: 'destructive' });
      return;
    }

    vote.mutate({
      commentId: comment.id,
      voteType,
      currentVote: comment.user_vote,
    });
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;

    try {
      await createComment.mutateAsync({
        postId,
        content: replyContent,
        parentId: comment.id,
      });
      setReplyContent('');
      setIsReplying(false);
      toast({ title: 'Réponse publiée !' });
    } catch (error) {
      toast({ title: 'Échec de la publication de la réponse', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce commentaire ?')) return;

    try {
      await deleteComment.mutateAsync({ commentId: comment.id, postId });
      toast({ title: 'Commentaire supprimé' });
    } catch (error) {
      toast({ title: 'Échec de la suppression du commentaire', variant: 'destructive' });
    }
  };

  const canDelete = user && (user.id === comment.user_id);

  return (
    <div className="flex gap-4">
      {/* Vote buttons */}
      <div className="flex flex-col items-center gap-1 text-muted-foreground">
        <button
          onClick={() => handleVote(1)}
          className={cn(
            'p-1 rounded hover:bg-primary/10 transition-colors',
            comment.user_vote === 1 && 'text-primary'
          )}
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <span
          className={cn(
            'text-sm font-bold',
            score > 0 && 'text-primary',
            score < 0 && 'text-destructive'
          )}
        >
          {score}
        </span>
        <button
          onClick={() => handleVote(-1)}
          className={cn(
            'p-1 rounded hover:bg-destructive/10 transition-colors',
            comment.user_vote === -1 && 'text-destructive'
          )}
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {comment.profiles && (
            <Link
              to={`/@${comment.profiles.username}`}
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <Avatar className="w-5 h-5">
                <AvatarImage src={comment.profiles.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {(comment.profiles.display_name || comment.profiles.username || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{comment.profiles.username || comment.profiles.display_name || 'Anonymous'}</span>
            </Link>
          )}
          <span>•</span>
          <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
        </div>

        {/* Content */}
        <div className={cn('text-sm', comment.is_spoiler && 'blur-sm hover:blur-none transition-all')}>
          {comment.content}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          > 
            Répondre
          </button>
          {canDelete && (
            <button
              onClick={handleDelete}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Supprimer
            </button>
          )}
        </div>

        {/* Reply form */}
        {isReplying && (
          <div className="space-y-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Écrire une réponse..."
              className="min-h-[80px] bg-muted/30"
            />
            <div className="flex gap-2">
              <Button onClick={handleReply} size="sm" disabled={!replyContent.trim()}>
                Publier la réponse
              </Button>
              <Button onClick={() => setIsReplying(false)} size="sm" variant="ghost">
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-4 space-y-4 border-l-2 border-muted pl-4">
            {comment.replies.map((reply) => (
              <CommentCard key={reply.id} comment={reply} postId={postId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForumPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentContent, setCommentContent] = useState('');

  const { data: post, isLoading: loadingPost } = useForumPost(postId!);
  const { data: comments = [], isLoading: loadingComments } = useForumComments(postId!);
  const createComment = useCreateForumComment();
  const vote = useForumVote();
  const deletePost = useDeleteForumPost();

  if (!postId) {
    return <div>ID de publication invalide</div>;
  }

  const handleVote = (voteType: 1 | -1) => {
    if (!user) {
      toast({ title: 'Veuillez vous connecter pour voter', variant: 'destructive' });
      return;
    }

    vote.mutate({
      postId,
      voteType,
      currentVote: post?.user_vote,
    });
  };

  const handleComment = async () => {
    if (!commentContent.trim()) return;

    try {
      await createComment.mutateAsync({
        postId,
        content: commentContent,
      });
      setCommentContent('');
      toast({ title: 'Commentaire publié !' });
    } catch (error) {
      toast({ title: 'Échec de la publication du commentaire', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette publication ?')) return;

    try {
      await deletePost.mutateAsync(postId);
      toast({ title: 'Publication supprimée' });
      navigate('/community');
    } catch (error) {
      toast({ title: 'Échec de la suppression de la publication', variant: 'destructive' });
    }
  };

  const score = post ? post.upvotes - post.downvotes : 0;
  const canDelete = user && post && user.id === post.user_id;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* <StatusVideoBackground /> */}
      <Sidebar />

      <main className="relative z-10 pl-0 md:pl-20 lg:pl-24 w-full">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          {/* Back button */}
          <Button variant="ghost" onClick={() => navigate('/community')} className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
Retour à la communauté
          </Button>

          {loadingPost ? (
            <GlassPanel className="p-8">
              <div className="h-8 bg-muted rounded animate-pulse mb-4" />
              <div className="h-32 bg-muted rounded animate-pulse" />
            </GlassPanel>
          ) : post ? (
            <div className="space-y-6">
              {/* Post */}
              <GlassPanel className="p-6">
                <div className="flex gap-4">
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <button
                      onClick={() => handleVote(1)}
                      className={cn(
                        'p-2 rounded hover:bg-primary/10 transition-colors',
                        post.user_vote === 1 && 'text-primary'
                      )}
                    >
                      <ArrowUp className="w-6 h-6" />
                    </button>
                    <span
                      className={cn(
                        'text-lg font-bold',
                        score > 0 && 'text-primary',
                        score < 0 && 'text-destructive'
                      )}
                    >
                      {score}
                    </span>
                    <button
                      onClick={() => handleVote(-1)}
                      className={cn(
                        'p-2 rounded hover:bg-destructive/10 transition-colors',
                        post.user_vote === -1 && 'text-destructive'
                      )}
                    >
                      <ArrowDown className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Flair and metadata */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.is_pinned && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-xs font-bold flex items-center gap-1">
                          <Pin className="w-3 h-3" />
                          Épinglé
                        </span>
                      )}
                      {post.is_locked && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 text-xs font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Verrouillé
                        </span>
                      )}
                      {post.flair && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                          {post.flair}
                        </span>
                      )}
                      {post.is_spoiler && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 text-xs font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Spolier
                        </span>
                      )}
                      {post.anime_name && (
                        <Link
                          to={`/anime/${post.anime_id}`}
                          className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs hover:text-foreground transition-colors"
                        >
                          {post.anime_name}
                        </Link>
                      )}
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold">{post.title}</h1>

                    {/* Author and metadata */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {post.profiles && (
                        <Link
                          to={`/@${post.profiles.username}`}
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={post.profiles.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(post.profiles.display_name || post.profiles.username || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{post.profiles.username || post.profiles.display_name || 'Anonymous'}</span>
                        </Link>
                      )}
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {post.views_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {post.comments_count}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="prose prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {/* Forum post image if present */}
                    {post.image_url && (
                      <div className="mt-4">
                        <img
                          src={getProxiedImageUrl(post.image_url)}
                          alt="Image de publication forum"
                          className="max-w-full h-auto rounded-lg border border-white/10"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    {canDelete && (
                      <div className="flex gap-2 pt-4 border-t border-white/5">
                        <Button onClick={handleDelete} variant="destructive" size="sm" className="gap-2">
                          <Trash2 className="w-4 h-4" />
                          Supprimer la publication
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Anime poster thumbnail if present */}
                  {post.anime_poster && (
                    <div className="hidden sm:block w-32 h-44 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={getProxiedImageUrl(post.anime_poster)}
                        alt={post.anime_name || ''}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </GlassPanel>

              {/* Comment form */}
              {user && !post.is_locked ? (
                <GlassPanel className="p-6">
                  <h3 className="text-lg font-bold mb-4">Ajouter un commentaire</h3>
                  <div className="space-y-4">
                    <Textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Qu'en pensez-vous ?"
                      className="min-h-[120px] bg-muted/30"
                    />
                    <Button onClick={handleComment} disabled={!commentContent.trim()} className="gap-2">
                      <Send className="w-4 h-4" />
                      Publier le commentaire
                    </Button>
                  </div>
                </GlassPanel>
              ) : !user ? (
                <GlassPanel className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">Connectez-vous pour laisser un commentaire</p>
                  <Button onClick={() => navigate('/auth')}>Connexion</Button>
                </GlassPanel>
              ) : (
                <GlassPanel className="p-6 text-center">
                  <Lock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Cette publication est verrouillée</p>
                </GlassPanel>
              )}

              {/* Comments */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Commentaires ({post.comments_count})
                </h3>

                {loadingComments ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <GlassPanel key={i} className="p-4">
                        <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                        <div className="h-16 bg-muted rounded animate-pulse" />
                      </GlassPanel>
                    ))}
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-6">
                    {comments.map((comment, index) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <GlassPanel className="p-4">
                          <CommentCard comment={comment} postId={postId} />
                        </GlassPanel>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <GlassPanel className="p-8 text-center">
                    <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Aucun commentaire. Soyez le premier !</p>
                  </GlassPanel>
                )}
              </div>
            </div>
          ) : (
            <GlassPanel className="p-12 text-center">
              <h2 className="text-2xl font-bold mb-2">Publication introuvable</h2>
              <p className="text-muted-foreground mb-6">Cette publication a peut-être été supprimée ou n'existe pas.</p>
              <Button onClick={() => navigate('/community')}>Retour à la communauté</Button>
            </GlassPanel>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
