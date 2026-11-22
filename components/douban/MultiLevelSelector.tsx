'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface MultiLevelOption {
  label: string;
  value: string;
}

interface MultiLevelCategory {
  key: string;
  label: string;
  options: MultiLevelOption[];
}

export type MultiLevelContentType =
  | 'movie'
  | 'tv'
  | 'show'
  | 'anime-tv'
  | 'anime-movie';

interface MultiLevelSelectorProps {
  onChange: (values: Record<string, string>) => void;
  contentType?: MultiLevelContentType;
}

const ALL_OPTION: MultiLevelOption = { label: '全部', value: 'all' };

const MOVIE_TYPE_OPTIONS: MultiLevelOption[] = [
  ALL_OPTION,
  { label: '喜剧', value: 'comedy' },
  { label: '爱情', value: 'romance' },
  { label: '动作', value: 'action' },
  { label: '科幻', value: 'sci-fi' },
  { label: '悬疑', value: 'suspense' },
  { label: '犯罪', value: 'crime' },
  { label: '惊悚', value: 'thriller' },
  { label: '冒险', value: 'adventure' },
  { label: '音乐', value: 'music' },
  { label: '历史', value: 'history' },
  { label: '奇幻', value: 'fantasy' },
  { label: '恐怖', value: 'horror' },
  { label: '战争', value: 'war' },
  { label: '传记', value: 'biography' },
  { label: '歌舞', value: 'musical' },
  { label: '武侠', value: 'wuxia' },
  { label: '情色', value: 'erotic' },
  { label: '灾难', value: 'disaster' },
  { label: '西部', value: 'western' },
  { label: '纪录片', value: 'documentary' },
  { label: '短片', value: 'short' },
];

const TV_TYPE_OPTIONS: MultiLevelOption[] = [
  ALL_OPTION,
  { label: '喜剧', value: 'comedy' },
  { label: '爱情', value: 'romance' },
  { label: '悬疑', value: 'suspense' },
  { label: '武侠', value: 'wuxia' },
  { label: '古装', value: 'costume' },
  { label: '家庭', value: 'family' },
  { label: '犯罪', value: 'crime' },
  { label: '科幻', value: 'sci-fi' },
  { label: '恐怖', value: 'horror' },
  { label: '历史', value: 'history' },
  { label: '战争', value: 'war' },
  { label: '动作', value: 'action' },
  { label: '冒险', value: 'adventure' },
  { label: '传记', value: 'biography' },
  { label: '剧情', value: 'drama' },
  { label: '奇幻', value: 'fantasy' },
  { label: '惊悚', value: 'thriller' },
  { label: '灾难', value: 'disaster' },
  { label: '歌舞', value: 'musical' },
  { label: '音乐', value: 'music' },
];

const SHOW_TYPE_OPTIONS: MultiLevelOption[] = [
  ALL_OPTION,
  { label: '真人秀', value: 'reality' },
  { label: '脱口秀', value: 'talkshow' },
  { label: '音乐', value: 'music' },
  { label: '歌舞', value: 'musical' },
];

const ANIME_MOVIE_LABEL_OPTIONS: MultiLevelOption[] = [
  ALL_OPTION,
  { label: '定格动画', value: 'stop_motion' },
  { label: '传记', value: 'biography' },
  { label: '美国动画', value: 'us_animation' },
  { label: '爱情', value: 'romance' },
  { label: '黑色幽默', value: 'dark_humor' },
  { label: '歌舞', value: 'musical' },
  { label: '儿童', value: 'children' },
  { label: '二次元', value: 'anime' },
  { label: '动物', value: 'animal' },
  { label: '青春', value: 'youth' },
  { label: '历史', value: 'history' },
  { label: '励志', value: 'inspirational' },
  { label: '恶搞', value: 'parody' },
  { label: '治愈', value: 'healing' },
  { label: '运动', value: 'sports' },
  { label: '后宫', value: 'harem' },
  { label: '情色', value: 'erotic' },
  { label: '人性', value: 'human_nature' },
  { label: '悬疑', value: 'suspense' },
  { label: '恋爱', value: 'love' },
  { label: '魔幻', value: 'fantasy' },
  { label: '科幻', value: 'sci_fi' },
];

const ANIME_TV_LABEL_OPTIONS: MultiLevelOption[] = [
  ALL_OPTION,
  { label: '黑色幽默', value: 'dark_humor' },
  { label: '历史', value: 'history' },
  { label: '歌舞', value: 'musical' },
  { label: '励志', value: 'inspirational' },
  { label: '恶搞', value: 'parody' },
  { label: '治愈', value: 'healing' },
  { label: '运动', value: 'sports' },
  { label: '后宫', value: 'harem' },
  { label: '情色', value: 'erotic' },
  { label: '国漫', value: 'chinese_anime' },
  { label: '人性', value: 'human_nature' },
  { label: '悬疑', value: 'suspense' },
  { label: '恋爱', value: 'love' },
  { label: '魔幻', value: 'fantasy' },
  { label: '科幻', value: 'sci_fi' },
];

const MOVIE_REGION_OPTIONS: MultiLevelOption[] = [
  ALL_OPTION,
  { label: '华语', value: 'chinese' },
  { label: '欧美', value: 'western' },
  { label: '韩国', value: 'korean' },
  { label: '日本', value: 'japanese' },
  { label: '中国大陆', value: 'mainland_china' },
  { label: '美国', value: 'usa' },
  { label: '中国香港', value: 'hong_kong' },
  { label: '中国台湾', value: 'taiwan' },
  { label: '英国', value: 'uk' },
  { label: '法国', value: 'france' },
  { label: '德国', value: 'germany' },
  { label: '意大利', value: 'italy' },
  { label: '西班牙', value: 'spain' },
  { label: '印度', value: 'india' },
  { label: '泰国', value: 'thailand' },
  { label: '俄罗斯', value: 'russia' },
  { label: '加拿大', value: 'canada' },
  { label: '澳大利亚', value: 'australia' },
  { label: '爱尔兰', value: 'ireland' },
  { label: '瑞典', value: 'sweden' },
  { label: '巴西', value: 'brazil' },
  { label: '丹麦', value: 'denmark' },
];

const TV_REGION_OPTIONS: MultiLevelOption[] = [
  ALL_OPTION,
  { label: '华语', value: 'chinese' },
  { label: '欧美', value: 'western' },
  { label: '国外', value: 'foreign' },
  { label: '韩国', value: 'korean' },
  { label: '日本', value: 'japanese' },
  { label: '中国大陆', value: 'mainland_china' },
  { label: '中国香港', value: 'hong_kong' },
  { label: '美国', value: 'usa' },
  { label: '英国', value: 'uk' },
  { label: '泰国', value: 'thailand' },
  { label: '中国台湾', value: 'taiwan' },
  { label: '意大利', value: 'italy' },
  { label: '法国', value: 'france' },
  { label: '德国', value: 'germany' },
  { label: '西班牙', value: 'spain' },
  { label: '俄罗斯', value: 'russia' },
  { label: '瑞典', value: 'sweden' },
  { label: '巴西', value: 'brazil' },
  { label: '丹麦', value: 'denmark' },
  { label: '印度', value: 'india' },
  { label: '加拿大', value: 'canada' },
  { label: '爱尔兰', value: 'ireland' },
  { label: '澳大利亚', value: 'australia' },
];

const PLATFORM_OPTIONS: MultiLevelOption[] = [
  ALL_OPTION,
  { label: '腾讯视频', value: 'tencent' },
  { label: '爱奇艺', value: 'iqiyi' },
  { label: '优酷', value: 'youku' },
  { label: '湖南卫视', value: 'hunan_tv' },
  { label: 'Netflix', value: 'netflix' },
  { label: 'HBO', value: 'hbo' },
  { label: 'BBC', value: 'bbc' },
  { label: 'NHK', value: 'nhk' },
  { label: 'CBS', value: 'cbs' },
  { label: 'NBC', value: 'nbc' },
  { label: 'tvN', value: 'tvn' },
];

const YEAR_OPTIONS: MultiLevelOption[] = [
  ALL_OPTION,
  { label: '2020年代', value: '2020s' },
  { label: '2026', value: '2026' },
  { label: '2025', value: '2025' },
  { label: '2024', value: '2024' },
  { label: '2023', value: '2023' },
  { label: '2022', value: '2022' },
  { label: '2021', value: '2021' },
  { label: '2020', value: '2020' },
  { label: '2019', value: '2019' },
  { label: '2010年代', value: '2010s' },
  { label: '2000年代', value: '2000s' },
  { label: '90年代', value: '1990s' },
  { label: '80年代', value: '1980s' },
  { label: '70年代', value: '1970s' },
  { label: '60年代', value: '1960s' },
  { label: '更早', value: 'earlier' },
];

function getSortOptions(contentType: MultiLevelContentType): MultiLevelOption[] {
  return [
    { label: '综合排序', value: 'T' },
    { label: '近期热度', value: 'U' },
    {
      label:
        contentType === 'tv' || contentType === 'show' || contentType === 'anime-tv'
          ? '首播时间'
          : '首映时间',
      value: 'R',
    },
    { label: '高分优先', value: 'S' },
  ];
}

function defaultSort(contentType: MultiLevelContentType): string {
  return contentType === 'anime-tv' || contentType === 'anime-movie' ? 'U' : 'T';
}

function buildCategories(contentType: MultiLevelContentType): MultiLevelCategory[] {
  const categories: MultiLevelCategory[] = [];

  if (contentType === 'anime-tv' || contentType === 'anime-movie') {
    categories.push({
      key: 'label',
      label: '类型',
      options:
        contentType === 'anime-tv'
          ? ANIME_TV_LABEL_OPTIONS
          : ANIME_MOVIE_LABEL_OPTIONS,
    });
  } else {
    categories.push({
      key: 'type',
      label: '类型',
      options:
        contentType === 'movie'
          ? MOVIE_TYPE_OPTIONS
          : contentType === 'show'
            ? SHOW_TYPE_OPTIONS
            : TV_TYPE_OPTIONS,
    });
  }

  categories.push({
    key: 'region',
    label: '地区',
    options: contentType === 'movie' || contentType === 'anime-movie'
      ? MOVIE_REGION_OPTIONS
      : TV_REGION_OPTIONS,
  });

  categories.push({ key: 'year', label: '年代', options: YEAR_OPTIONS });

  if (contentType === 'tv' || contentType === 'show' || contentType === 'anime-tv') {
    categories.push({ key: 'platform', label: '平台', options: PLATFORM_OPTIONS });
  }

  categories.push({
    key: 'sort',
    label: '排序',
    options: getSortOptions(contentType),
  });

  return categories;
}

function emptyValues(contentType: MultiLevelContentType): Record<string, string> {
  return {
    type: 'all',
    region: 'all',
    year: 'all',
    platform: 'all',
    label: 'all',
    sort: defaultSort(contentType),
  };
}

/**
 * 多级筛选标签（移植自 LunaTV MultiLevelSelector）。
 */
export function MultiLevelSelector({
  onChange,
  contentType = 'movie',
}: MultiLevelSelectorProps) {
  const categories = buildCategories(contentType);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0, width: 0 });
  const [values, setValues] = useState<Record<string, string>>(() => emptyValues(contentType));
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const calculateDropdownPosition = (categoryKey: string) => {
    const element = categoryRefs.current[categoryKey];
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const isMobile = viewportWidth < 768;

    let x = rect.left;
    let dropdownWidth = Math.max(rect.width, 300);
    let useFixedWidth = false;

    if (isMobile) {
      const padding = 16;
      const maxWidth = viewportWidth - padding * 2;
      dropdownWidth = Math.min(dropdownWidth, maxWidth);
      useFixedWidth = true;
      if (x + dropdownWidth > viewportWidth - padding) {
        x = viewportWidth - dropdownWidth - padding;
      }
      if (x < padding) x = padding;
    }

    setDropdownPosition({
      x,
      y: rect.bottom,
      width: useFixedWidth ? dropdownWidth : rect.width,
    });
  };

  const handleCategoryClick = (categoryKey: string) => {
    if (activeCategory === categoryKey) {
      setActiveCategory(null);
      return;
    }
    setActiveCategory(categoryKey);
    calculateDropdownPosition(categoryKey);
  };

  const handleOptionSelect = (categoryKey: string, optionValue: string) => {
    const newValues = { ...values, [categoryKey]: optionValue };
    setValues(newValues);

    const selections = emptyValues(contentType);
    Object.entries(newValues).forEach(([key, value]) => {
      if (value && value !== 'all' && (key !== 'sort' || value !== defaultSort(contentType))) {
        const category = categories.find((item) => item.key === key);
        const option = category?.options.find((item) => item.value === value);
        if (option) {
          selections[key] = key === 'sort' ? option.value : option.label;
        }
      }
    });

    onChange(selections);
    setActiveCategory(null);
  };

  const getDisplayText = (categoryKey: string) => {
    const category = categories.find((item) => item.key === categoryKey);
    if (!category) return '';
    const value = values[categoryKey];

    if (categoryKey === 'sort') {
      return category.options.find((option) => option.value === value)?.label || category.label;
    }
    if (!value || value === 'all') return category.label;
    return category.options.find((option) => option.value === value)?.label || category.label;
  };

  const isDefaultValue = (categoryKey: string) => {
    const value = values[categoryKey];
    if (categoryKey === 'sort') return false;
    return !value || value === 'all';
  };

  const isOptionSelected = (categoryKey: string, optionValue: string) => {
    let value = values[categoryKey];
    if (value === undefined) {
      value = categoryKey === 'sort' ? defaultSort(contentType) : 'all';
    }
    return value === optionValue;
  };

  useEffect(() => {
    const handleScroll = () => {
      if (activeCategory) setActiveCategory(null);
    };
    const handleResize = () => {
      if (activeCategory) calculateDropdownPosition(activeCategory);
    };

    document.body.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeCategory]);

  useEffect(() => {
    onChange(emptyValues(contentType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !Object.values(categoryRefs.current).some(
          (ref) => ref && ref.contains(event.target as Node)
        )
      ) {
        setActiveCategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="relative inline-flex gap-1 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] p-1">
        {categories.map((category) => {
          const isOpen = activeCategory === category.key;
          const isDefault = isDefaultValue(category.key);

          return (
            <div
              key={category.key}
              ref={(el) => {
                categoryRefs.current[category.key] = el;
              }}
              className="relative"
            >
              <button
                type="button"
                onClick={() => handleCategoryClick(category.key)}
                className={`relative z-10 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isOpen
                    ? 'bg-[var(--accent-color)] text-white'
                    : isDefault
                      ? 'text-[var(--text-color-secondary)] hover:text-[var(--text-color)]'
                      : 'text-[var(--accent-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                }`}
              >
                <span>{getDisplayText(category.key)}</span>
                <svg
                  className={`inline-block ml-1 h-3 w-3 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {activeCategory &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-2xl shadow-[var(--shadow-md)]"
            style={{
              left: `${dropdownPosition.x}px`,
              top: `${dropdownPosition.y}px`,
              ...(window.innerWidth < 768
                ? { width: `${dropdownPosition.width}px` }
                : { minWidth: `${Math.max(dropdownPosition.width, 300)}px` }),
              maxWidth: '600px',
              position: 'fixed',
            }}
          >
            <div className="p-2 sm:p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 sm:gap-2">
                {categories
                  .find((category) => category.key === activeCategory)
                  ?.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleOptionSelect(activeCategory, option.value)}
                      className={`rounded-lg px-2 py-1.5 text-left text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                        isOptionSelected(activeCategory, option.value)
                          ? 'border border-[color-mix(in_srgb,var(--accent-color)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-color)_12%,transparent)] text-[var(--accent-color)]'
                          : 'border border-transparent text-[var(--text-color-secondary)] hover:bg-[color-mix(in_srgb,var(--text-color)_8%,transparent)] hover:text-[var(--text-color)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
