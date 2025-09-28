import React from 'react';
import { Link } from './Link';
import './BlogIndex.css';

interface BlogCardProps {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  href: string;
  tags?: string[];
}

export function BlogCard({ title, date, author, excerpt, href, tags = [] }: BlogCardProps) {
  return (
    <Link 
      href={href} 
      className="blog-card"
      forceTraditionalLink={false}
    >
      <article className="blog-card-content">
        <div className="blog-card-meta">
          <time className="blog-card-date">{date}</time>
          <span className="blog-card-author">by {author}</span>
        </div>
        
        <h2 className="blog-card-title">{title}</h2>
        
        <p className="blog-card-excerpt">{excerpt}</p>
        
        {tags.length > 0 && (
          <div className="blog-card-tags">
            {tags.map((tag) => (
              <span key={tag} className="blog-card-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <div className="blog-card-arrow">Read more →</div>
      </article>
    </Link>
  );
}
