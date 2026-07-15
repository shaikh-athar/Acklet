// client/src/app/core/mock-data/blog.data.ts

export interface BlogArticle {
  slug: string;
  title: string;
  category: 'security' | 'developer' | 'privacy';
  summary: string;
  author: string;
  authorTitle: string;
  publishedDate: string;
  readTime: string;
  content: string;
}

export const MOCK_BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'why-local-processing-matters',
    title: 'The Hidden Risks of Online Formatters and Decoders',
    category: 'privacy',
    summary: 'Many online developers tools send your paste data directly to their servers. Here is why browser-based offline tools are essential for enterprise security.',
    author: 'Aria Sterling',
    authorTitle: 'Head of Privacy, Acklet',
    publishedDate: 'July 10, 2026',
    readTime: '6 min read',
    content: 'Online formatters have become an everyday tool for developers. Whether you need to beautify JSON, format SQL, or decode a JWT, the quickest path is usually a quick Google search. However, many developers fail to ask: where does that data go? \n\nWhen you paste API keys, customer databases, or proprietary configurations into an online tool, you are transmitting that data to a third-party server. If that server is compromised, your company’s internal details are leaked. \n\nAcklet is built on a simple principle: your data should never leave your machine. By executing all logic strictly inside the client browser, base64 operations and formatting runs fully sandboxed, preserving absolute security.'
  },
  {
    slug: 'mastering-jwt-payloads',
    title: 'Understanding Claims: A Deep Dive into JSON Web Tokens',
    category: 'security',
    summary: 'A look at custom claims, standard headers, verification techniques, and signature vulnerabilities in modern web applications.',
    author: 'Nikhil Nair',
    authorTitle: 'Security Researcher',
    publishedDate: 'June 28, 2026',
    readTime: '8 min read',
    content: 'JSON Web Tokens (JWT) are the standard for authorization in modern single-page apps. They package claims like user identities and authorization flags in a base64-encoded payload. \n\nHowever, signature verification errors are among the most common vulnerabilities. Developers often unpack headers and parse claims without verifying the cryptographic signature. In this article, we explain how to inspect tokens safely using local tools, check for expiry fields, and configure RSA key pairs correctly.'
  }
];
