import React from 'react';
import { PublicDashboardEmbed } from '@/components/works/organisms/public-dashboard-embed';

const PublicArticleView = React.lazy(() => import('@/views/public-article-view'));
const EmbedArticleView = React.lazy(() => import('@/views/embed-article-view'));

export function PublicRoutes() {
  const path = window.location.pathname;
  const dashboardEmbed = path.match(/^\/embed\/dashboard\/([^/?#]+)/);
  if (dashboardEmbed) {
    return <PublicDashboardEmbed token={decodeURIComponent(dashboardEmbed[1])} embedded />;
  }

  const dashboardShare = new URLSearchParams(window.location.search).get('share');
  if (dashboardShare) return <PublicDashboardEmbed token={dashboardShare} />;

  const publicArticle = path.match(/^\/p\/([^/?#]+)/);
  if (publicArticle) {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-white dark:bg-neutral-950" />}>
        <PublicArticleView token={decodeURIComponent(publicArticle[1])} />
      </React.Suspense>
    );
  }

  const articleEmbed = path.match(/^\/embed\/article\/([^/?#]+)/);
  if (articleEmbed) {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-white dark:bg-neutral-950" />}>
        <EmbedArticleView token={decodeURIComponent(articleEmbed[1])} />
      </React.Suspense>
    );
  }

  return null;
}
