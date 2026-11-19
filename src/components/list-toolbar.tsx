"use client";

// Универсальный блок списка: поиск, фильтр по категории и сортировка.
// Все элементы стоят в одну строку; на узком экране переносятся друг под друга.
// Используется на страницах «Каталог», «Мои тесты», «Материалы» и «Результаты».

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers";

export interface ToolbarSortOption {
  value: string;
  label: string;
}

interface ListToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  /** Существующие категории; если не переданы — фильтр не показывается. */
  categories?: string[];
  category?: string;
  onCategory?: (value: string) => void;
  sortOptions: ToolbarSortOption[];
  sortBy: string;
  onSortBy: (value: string) => void;
  sortOrder: "asc" | "desc";
  onSortOrder: (value: "asc" | "desc") => void;
  /** Подпись «Найдено: N». */
  resultLabel?: string;
}

/** Выпадающий список категорий с поиском по введённому тексту. */
function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useApp();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Если категория выбрана снаружи — показываем её в поле.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Закрываем список по клику вне компонента.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        // Если категорию не выбрали — возвращаем в поле текущее значение.
        setQuery(value);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [value]);

  const search = query.trim().toLowerCase();
  const filtered = categories.filter((item) => item.toLowerCase().includes(search));

  function choose(next: string) {
    onChange(next);
    setQuery(next);
    setOpen(false);
  }

  return (
    <div className="combobox" ref={containerRef}>
      <input
        className="input combobox__input"
        value={query}
        placeholder={t("common.allCategories")}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setQuery(value);
          }
          if (event.key === "Enter") {
            event.preventDefault();
            choose(filtered.length > 0 ? filtered[0] : "");
          }
        }}
        role="combobox"
        aria-expanded={open}
        aria-label={t("common.allCategories")}
      />

      <button
        type="button"
        className="combobox__toggle"
        onClick={() => {
          setOpen((previous) => !previous);
          setQuery(value);
        }}
        aria-label={t("common.allCategories")}
        tabIndex={-1}
      >
        ▾
      </button>

      {open && (
        <div className="combobox__list" role="listbox">
          <button
            type="button"
            className={
              value === "" ? "combobox__item combobox__item--active" : "combobox__item"
            }
            onClick={() => choose("")}
          >
            {t("common.allCategories")}
          </button>

          {filtered.map((category) => (
            <button
              key={category}
              type="button"
              className={
                category === value
                  ? "combobox__item combobox__item--active"
                  : "combobox__item"
              }
              onClick={() => choose(category)}
            >
              {category}
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="combobox__empty">{t("common.empty")}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ListToolbar({
  search,
  onSearch,
  searchPlaceholder,
  categories,
  category,
  onCategory,
  sortOptions,
  sortBy,
  onSortBy,
  sortOrder,
  onSortOrder,
  resultLabel,
}: ListToolbarProps) {
  const { t } = useApp();

  return (
    <section className="card">
      <div className="toolbar">
        <input
          className="input toolbar__search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={t("common.search")}
        />

        {categories && onCategory && (
          <CategorySelect
            categories={categories}
            value={category ?? ""}
            onChange={onCategory}
          />
        )}

        <select
          className="select toolbar__select"
          value={sortBy}
          onChange={(event) => onSortBy(event.target.value)}
          aria-label={t("catalog.sort")}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="select toolbar__direction"
          value={sortOrder}
          onChange={(event) => onSortOrder(event.target.value === "asc" ? "asc" : "desc")}
          aria-label={t("catalog.sort")}
        >
          <option value="desc">{t("catalog.sort.desc")}</option>
          <option value="asc">{t("catalog.sort.asc")}</option>
        </select>

        {resultLabel && <span className="toolbar__count small muted">{resultLabel}</span>}
      </div>
    </section>
  );
}
