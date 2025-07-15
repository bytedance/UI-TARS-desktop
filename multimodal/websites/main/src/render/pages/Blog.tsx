import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getBlogContent } from '../../docs';
import { getSortedBlogPosts, getBlogPostByPermalink, getBlogPermalink, BlogPost } from '../../docs';
import { motion } from 'framer-motion';
import { Button, Card, Divider } from '@nextui-org/react';
import { FiArrowLeft, FiCalendar, FiUser } from 'react-icons/fi';
import { TwitterCardMeta } from '../components/TwitterCardMeta';
import { MarkdownContent } from '../components/Markdown';
import { ETopRoute } from '../../constants/routes';

const Blog: React.FC = () => {
  const { year, month, day, slug } = useParams();
  const location = useLocation();
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check if we're on a specific blog post page
  const isPostPage = year && month && day && slug;
  const currentPost = isPostPage
    ? getBlogPostByPermalink(`/${year}/${month}/${day}/${slug}`)
    : undefined;

  // Get all blog posts for the listing page
  const allPosts = getSortedBlogPosts();

  useEffect(() => {
    const loadContent = async () => {
      if (!currentPost) {
        setIsLoading(false);
        return;
      }

      try {
        const localContent = getBlogContent(currentPost.id);
        if (localContent) {
          setContent(localContent);
        } else {
          throw new Error(`Failed to load blog: ${currentPost.id}`);
        }
      } catch (error) {
        console.error('Failed to load blog content:', error);
        setContent('# Error\nFailed to load blog content.');
      } finally {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    loadContent();
  }, [currentPost]);

  if (isPostPage && currentPost) {
    // Generate absolute URL for the current blog post
    const currentUrl = `${window.location.origin}${getBlogPermalink(currentPost)}`;

    return (
      <>
        <TwitterCardMeta
          title={`${currentPost.title} | Agent TARS Blog`}
          description={currentPost.excerpt}
          url={currentUrl}
          image={
            currentPost.coverImage ||
            'https://github.com/bytedance/UI-TARS-desktop/blob/main/apps/agent-tars/public/twitter-card.png?raw=true'
          }
        />

        <div className="min-h-screen pt-24 px-4 pb-24 bg-black text-white">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Button
                as={Link}
                to={ETopRoute.BLOG}
                variant="light"
                color="default"
                startContent={<FiArrowLeft />}
                className="mb-6"
              >
                Back to Blog
              </Button>

              <MarkdownContent
                markdown={content}
                isLoading={isLoading}
                contentKey={currentPost.id}
                publishDate={currentPost?.date}
                author={currentPost?.author}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Render blog listing page
  return (
    <>
      <TwitterCardMeta
        title="Agent TARS Blog - Latest Updates and Insights"
        description="Latest updates and insights from the Agent TARS team"
        url={`${window.location.origin}${ETopRoute.BLOG}`}
      />

      <div className="min-h-screen pt-24 px-4 bg-black text-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Blog
            </h1>
            <p className="text-xl text-gray-400">
              Latest updates and insights from the Agent TARS team
            </p>
          </motion.div>

          <div className="space-y-8">
            {allPosts.map((post, index) => (
              <BlogPostCard key={post.id} post={post} index={index} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// Blog post card component for the listing page
const BlogPostCard: React.FC<{ post: BlogPost; index: number }> = ({ post, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
            <div className="flex items-center gap-1">
              <FiCalendar className="text-gray-500" />
              <span>{post.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <FiUser className="text-gray-500" />
              <span>{post.author}</span>
            </div>
          </div>

          <Link to={getBlogPermalink(post)} className="block group">
            <h2 className="text-2xl font-bold mb-2 text-white group-hover:text-purple-400 transition-colors">
              {post.title}
            </h2>
            <p className="text-gray-400 mb-4">{post.excerpt}</p>
          </Link>

          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags?.map(tag => (
              <span key={tag} className="px-3 py-1 bg-white/10 text-white/70 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>

          <Button
            as={Link}
            to={getBlogPermalink(post)}
            color="primary"
            variant="ghost"
            size="sm"
            className="
              bg-gradient-to-r from-[#6D28D9] to-[#7C3AED]
              hover:from-[#5B21B6] hover:to-[#6D28D9]
              text-white font-medium px-3 py-2 rounded-full
              shadow-[0_0_15px_rgba(124,58,237,0.2)]
              border border-white/10
              backdrop-blur-sm
              transition-all duration-300
              hover:shadow-[0_0_20px_rgba(124,58,237,0.25)]
              hover:scale-105
              active:scale-95
              group
            "
          >
            Read more
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default Blog;
