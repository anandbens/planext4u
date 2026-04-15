import { next } from '@vercel/edge';

const CRAWLER_RE = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterestbot|bot|crawl|spider/i;

const OG_FUNCTION_BASE = 'https://jhtddsqnpfvjvnfojeea.supabase.co/functions/v1/og-share';

export default function middleware(request: Request) {
  const ua = request.headers.get('user-agent') || '';
  
  if (!CRAWLER_RE.test(ua)) {
    return next();
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // Match /app/product/:id
  const productMatch = path.match(/^\/app\/product\/([^/]+)/);
  if (productMatch) {
    return fetch(`${OG_FUNCTION_BASE}?type=product&id=${productMatch[1]}`);
  }

  // Match /app/service/:id
  const serviceMatch = path.match(/^\/app\/service\/([^/]+)/);
  if (serviceMatch) {
    return fetch(`${OG_FUNCTION_BASE}?type=service&id=${serviceMatch[1]}`);
  }

  // Match /app/classifieds/:id
  const classifiedMatch = path.match(/^\/app\/classifieds\/([^/]+)/);
  if (classifiedMatch) {
    return fetch(`${OG_FUNCTION_BASE}?type=classified&id=${classifiedMatch[1]}`);
  }

  return next();
}

export const config = {
  matcher: ['/app/product/:path*', '/app/service/:path*', '/app/classifieds/:path*'],
};
