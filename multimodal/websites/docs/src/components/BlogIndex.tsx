import React from 'react';
import { BlogCard } from './BlogCard';
import './BlogIndex.css';

interface BlogPost {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  href: string;
  tags?: string[];
}

interface BlogIndexProps {
  posts: BlogPost[];
}

export function BlogIndex({ posts }: BlogIndexProps) {
  return (
    <div className="blog-index">
      <header className="blog-index-header">
        <h1 className="blog-index-title">Blog</h1>
        <p className="blog-index-description">
          Latest updates, insights, and announcements from the Agent TARS team
        </p>
      </header>
      
      <div className="blog-index-grid">
        {posts.map((post, index) => (
          <BlogCard
            key={index}
            title={post.title}
            date={post.date}
            author={post.author}
            excerpt={post.excerpt}
            href={post.href}
            tags={post.tags}
          />
        ))}
      </div>
      
      {posts.length === 0 && (
        <div className="blog-index-empty">
          <p>No blog posts available yet. Stay tuned for updates!</p>
        </div>
      )}
    </div>
  );
}
