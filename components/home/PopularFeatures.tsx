/**
 * PopularFeatures - 首页精品推荐。
 * 分类导航已合并到 MainNav，首页只展示精品推荐内容。
 */

'use client';

import { useRouter } from 'next/navigation';
import { FeaturedRecommendations } from './FeaturedRecommendations';

interface PopularFeaturesProps {
  onSearch?: (query: string) => void;
}

export function PopularFeatures({ onSearch }: PopularFeaturesProps) {
  const router = useRouter();

  return (
    <div className="animate-fade-in">
      <FeaturedRecommendations
        onSearch={(title) => {
          if (onSearch) onSearch(title);
        }}
        onMore={(section) => {
          if (section === 'hotMovies') {
            router.push('/douban?type=movie');
          } else if (section === 'hotTvShows') {
            router.push('/douban?type=tv');
          } else if (section === 'hotVarietyShows') {
            router.push('/douban?type=show');
          } else {
            router.push('/shortdrama');
          }
        }}
      />
    </div>
  );
}
