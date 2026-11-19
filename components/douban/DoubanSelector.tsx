'use client';

import { MultiLevelSelector, type MultiLevelContentType } from './MultiLevelSelector';
import { WeekdaySelector } from './WeekdaySelector';

interface SelectorOption {
  label: string;
  value: string;
}

interface DoubanSelectorProps {
  type: 'movie' | 'tv' | 'show' | 'anime';
  primarySelection: string;
  secondarySelection: string;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  onMultiLevelChange: (values: Record<string, string>) => void;
  onWeekdayChange: (weekday: string) => void;
}

const MOVIE_PRIMARY_OPTIONS: SelectorOption[] = [
  { label: '全部', value: '全部' },
  { label: '热门电影', value: '热门' },
  { label: '最新电影', value: '最新' },
  { label: '豆瓣高分', value: '豆瓣高分' },
  { label: '冷门佳片', value: '冷门佳片' },
];

const MOVIE_SECONDARY_OPTIONS: SelectorOption[] = [
  { label: '全部', value: '全部' },
  { label: '华语', value: '华语' },
  { label: '欧美', value: '欧美' },
  { label: '韩国', value: '韩国' },
  { label: '日本', value: '日本' },
];

const TV_PRIMARY_OPTIONS: SelectorOption[] = [
  { label: '全部', value: '全部' },
  { label: '最近热门', value: '最近热门' },
];

const TV_SECONDARY_OPTIONS: SelectorOption[] = [
  { label: '全部', value: 'tv' },
  { label: '国产', value: 'tv_domestic' },
  { label: '欧美', value: 'tv_american' },
  { label: '日本', value: 'tv_japanese' },
  { label: '韩国', value: 'tv_korean' },
  { label: '动漫', value: 'tv_animation' },
  { label: '纪录片', value: 'tv_documentary' },
];

const SHOW_PRIMARY_OPTIONS: SelectorOption[] = [
  { label: '全部', value: '全部' },
  { label: '最近热门', value: '最近热门' },
];

const SHOW_SECONDARY_OPTIONS: SelectorOption[] = [
  { label: '全部', value: 'show' },
  { label: '国内', value: 'show_domestic' },
  { label: '国外', value: 'show_foreign' },
];

const ANIME_PRIMARY_OPTIONS: SelectorOption[] = [
  { label: '每日放送', value: '每日放送' },
  { label: '番剧', value: '番剧' },
  { label: '剧场版', value: '剧场版' },
];

function CapsuleRow({
  label,
  options,
  activeValue,
  onChange,
}: {
  label: string;
  options: SelectorOption[];
  activeValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-xs sm:text-sm font-medium text-[var(--text-color-secondary)] min-w-[48px]">
        {label}
      </span>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-1 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] p-1">
          {options.map((option) => {
            const isActive = option.value === activeValue;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent-color)] text-white shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-color-secondary)] hover:text-[var(--text-color)]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 豆瓣分类标签选择器（移植自 LunaTV DoubanSelector）。
 * 电影/剧集/综艺为两级选择器，动漫为一级 + 星期/多级筛选。
 */
export function DoubanSelector({
  type,
  primarySelection,
  secondarySelection,
  onPrimaryChange,
  onSecondaryChange,
  onMultiLevelChange,
  onWeekdayChange,
}: DoubanSelectorProps) {
  const animeFilterType: MultiLevelContentType =
    primarySelection === '番剧' ? 'anime-tv' : 'anime-movie';

  return (
    <div className="space-y-3 sm:space-y-4">
      {type === 'movie' && (
        <>
          <CapsuleRow
            label="分类"
            options={MOVIE_PRIMARY_OPTIONS}
            activeValue={primarySelection || MOVIE_PRIMARY_OPTIONS[0].value}
            onChange={onPrimaryChange}
          />
          {primarySelection !== '全部' ? (
            <CapsuleRow
              label="地区"
              options={MOVIE_SECONDARY_OPTIONS}
              activeValue={secondarySelection || MOVIE_SECONDARY_OPTIONS[0].value}
              onChange={onSecondaryChange}
            />
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-[var(--text-color-secondary)] min-w-[48px]">
                筛选
              </span>
              <div className="overflow-x-auto">
                <MultiLevelSelector
                  key={`${type}-${primarySelection}`}
                  onChange={onMultiLevelChange}
                  contentType="movie"
                />
              </div>
            </div>
          )}
        </>
      )}

      {type === 'tv' && (
        <>
          <CapsuleRow
            label="分类"
            options={TV_PRIMARY_OPTIONS}
            activeValue={primarySelection || TV_PRIMARY_OPTIONS[1].value}
            onChange={onPrimaryChange}
          />
          {(primarySelection || TV_PRIMARY_OPTIONS[1].value) === '最近热门' ? (
            <CapsuleRow
              label="类型"
              options={TV_SECONDARY_OPTIONS}
              activeValue={secondarySelection || TV_SECONDARY_OPTIONS[0].value}
              onChange={onSecondaryChange}
            />
          ) : (primarySelection || TV_PRIMARY_OPTIONS[1].value) === '全部' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-[var(--text-color-secondary)] min-w-[48px]">
                筛选
              </span>
              <div className="overflow-x-auto">
                <MultiLevelSelector
                  key={`${type}-${primarySelection}`}
                  onChange={onMultiLevelChange}
                  contentType="tv"
                />
              </div>
            </div>
          ) : null}
        </>
      )}

      {type === 'anime' && (
        <>
          <CapsuleRow
            label="分类"
            options={ANIME_PRIMARY_OPTIONS}
            activeValue={primarySelection || ANIME_PRIMARY_OPTIONS[0].value}
            onChange={onPrimaryChange}
          />
          {(primarySelection || ANIME_PRIMARY_OPTIONS[0].value) === '每日放送' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-[var(--text-color-secondary)] min-w-[48px]">
                星期
              </span>
              <div className="overflow-x-auto">
                <WeekdaySelector onWeekdayChange={onWeekdayChange} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-[var(--text-color-secondary)] min-w-[48px]">
                筛选
              </span>
              <div className="overflow-x-auto">
                <MultiLevelSelector
                  key={`${animeFilterType}-${primarySelection}`}
                  onChange={onMultiLevelChange}
                  contentType={animeFilterType}
                />
              </div>
            </div>
          )}
        </>
      )}

      {type === 'show' && (
        <>
          <CapsuleRow
            label="分类"
            options={SHOW_PRIMARY_OPTIONS}
            activeValue={primarySelection || SHOW_PRIMARY_OPTIONS[1].value}
            onChange={onPrimaryChange}
          />
          {(primarySelection || SHOW_PRIMARY_OPTIONS[1].value) === '最近热门' ? (
            <CapsuleRow
              label="类型"
              options={SHOW_SECONDARY_OPTIONS}
              activeValue={secondarySelection || SHOW_SECONDARY_OPTIONS[0].value}
              onChange={onSecondaryChange}
            />
          ) : (primarySelection || SHOW_PRIMARY_OPTIONS[1].value) === '全部' ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-[var(--text-color-secondary)] min-w-[48px]">
                筛选
              </span>
              <div className="overflow-x-auto">
                <MultiLevelSelector
                  key={`${type}-${primarySelection}`}
                  onChange={onMultiLevelChange}
                  contentType="show"
                />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
