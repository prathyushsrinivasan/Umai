import { useCallback, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '../api/client'
import { createRestaurant, fetchAreas, fetchCategories } from '../api/restaurants'
import { Chip } from '../components/ui/Chip'
import { useAsync } from '../hooks/useAsync'
import {
  FILTERABLE_VEGETARIAN_TYPES,
  PRICE_RANGES,
  PRICE_RANGE_LABELS,
  VEGETARIAN_TYPE_LABELS,
} from '../lib/labels'
import type { PriceRange, VegetarianType } from '../types/restaurant'

/**
 * レストラン追加 — submission form for signed-in users.
 *
 * Only name, coordinates and diet classification are required: a contributor rarely
 * knows every detail, and leaving a field blank is better than guessing.
 */
export function SubmitRestaurantPage() {
  const navigate = useNavigate()

  const loadCategories = useCallback((signal: AbortSignal) => fetchCategories(signal), [])
  const loadAreas = useCallback((signal: AbortSignal) => fetchAreas(signal), [])
  const categories = useAsync(loadCategories)
  const areas = useAsync(loadAreas)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [vegetarianType, setVegetarianType] = useState<VegetarianType | null>(null)
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [phone, setPhone] = useState('')
  const [openingHours, setOpeningHours] = useState('')
  const [categorySlugs, setCategorySlugs] = useState<string[]>([])
  const [areaSlug, setAreaSlug] = useState('')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function toggleCategory(slug: string) {
    setCategorySlugs((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!vegetarianType) {
      setError('ヴィーガン・ベジタリアン対応を選択してください。')
      return
    }

    const lat = Number(latitude)
    const lon = Number(longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError('緯度・経度を数値で入力してください。')
      return
    }

    setSubmitting(true)

    try {
      const created = await createRestaurant({
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        latitude: lat,
        longitude: lon,
        vegetarianType,
        priceRange: priceRange ?? undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        phone: phone.trim() || undefined,
        openingHours: openingHours.trim() || undefined,
        categorySlugs,
        areaSlug: areaSlug || undefined,
      })

      navigate(`/restaurants/${created.id}`)
    } catch (cause) {
      if (cause instanceof ApiError) {
        // Surface per-field messages from the backend next to their inputs.
        const errors = cause.body?.fieldErrors ?? []
        if (errors.length > 0) {
          setFieldErrors(Object.fromEntries(errors.map((item) => [item.field, item.message])))
          setError('入力内容を確認してください。')
        } else {
          setError(cause.message)
        }
      } else {
        setError('送信に失敗しました。時間をおいてもう一度お試しください。')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto max-w-2xl px-5 py-10"
    >
      <header>
        <h1 className="text-2xl font-bold text-bark-800">レストラン追加</h1>
        <p className="mt-1 text-sm text-bark-600">
          まだ登録されていないお店を教えてください。わかる範囲で構いません。
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Section title="基本情報">
          <TextField
            id="name"
            label="店名"
            required
            value={name}
            onChange={setName}
            maxLength={200}
            error={fieldErrors.name}
          />

          <TextAreaField
            id="description"
            label="説明"
            value={description}
            onChange={setDescription}
            maxLength={2000}
            hint="お店の雰囲気やおすすめメニューなど（任意）"
            error={fieldErrors.description}
          />

          <fieldset>
            <legend className="text-sm font-medium text-bark-600">
              ヴィーガン・ベジタリアン対応 <Required />
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {FILTERABLE_VEGETARIAN_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={VEGETARIAN_TYPE_LABELS[type]}
                  selected={vegetarianType === type}
                  onClick={() => setVegetarianType(type)}
                />
              ))}
            </div>
          </fieldset>

          {categories.data && (
            <fieldset>
              <legend className="text-sm font-medium text-bark-600">料理ジャンル</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.data.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.nameJa}
                    selected={categorySlugs.includes(category.slug)}
                    onClick={() => toggleCategory(category.slug)}
                  />
                ))}
              </div>
            </fieldset>
          )}
        </Section>

        <Section title="場所">
          <TextField
            id="address"
            label="住所"
            value={address}
            onChange={setAddress}
            maxLength={500}
            error={fieldErrors.address}
          />

          {areas.data && (
            <div>
              <label htmlFor="area" className="block text-sm font-medium text-bark-600">
                エリア
              </label>
              <select
                id="area"
                value={areaSlug}
                onChange={(event) => setAreaSlug(event.target.value)}
                className="mt-1.5 w-full rounded-cozy border border-cream-300 bg-white px-4 py-2.5 text-bark-800 focus:border-leaf-400 focus:outline-none focus:ring-3 focus:ring-leaf-100"
              >
                <option value="">選択しない</option>
                {areas.data.map((area) => (
                  <option key={area.id} value={area.slug}>
                    {area.nameJa}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="latitude"
              label="緯度"
              required
              value={latitude}
              onChange={setLatitude}
              placeholder="35.6896"
              inputMode="decimal"
              error={fieldErrors.latitude}
            />
            <TextField
              id="longitude"
              label="経度"
              required
              value={longitude}
              onChange={setLongitude}
              placeholder="139.7006"
              inputMode="decimal"
              error={fieldErrors.longitude}
            />
          </div>
          <p className="text-xs text-bark-400">
            地図サービスでお店の位置を右クリックすると座標を確認できます。
          </p>
        </Section>

        <Section title="詳細情報（任意）">
          <fieldset>
            <legend className="text-sm font-medium text-bark-600">価格帯</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRICE_RANGES.map((range) => (
                <Chip
                  key={range}
                  label={PRICE_RANGE_LABELS[range]}
                  selected={priceRange === range}
                  onClick={() => setPriceRange(priceRange === range ? null : range)}
                />
              ))}
            </div>
          </fieldset>

          <TextField
            id="openingHours"
            label="営業時間"
            value={openingHours}
            onChange={setOpeningHours}
            maxLength={500}
            placeholder="11:00-21:00（水曜定休）"
            error={fieldErrors.openingHours}
          />

          <TextField
            id="websiteUrl"
            label="Webサイト"
            type="url"
            value={websiteUrl}
            onChange={setWebsiteUrl}
            placeholder="https://example.com"
            error={fieldErrors.websiteUrl}
          />

          <TextField
            id="phone"
            label="電話番号"
            type="tel"
            value={phone}
            onChange={setPhone}
            placeholder="03-0000-0000"
            error={fieldErrors.phone}
          />
        </Section>

        {error && (
          <p role="alert" className="rounded-cozy bg-apricot-300/25 px-4 py-3 text-sm text-bark-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full cursor-pointer rounded-pill bg-leaf-500 py-3.5 font-medium text-white shadow-soft transition-colors hover:bg-leaf-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? '送信中…' : 'このお店を登録する'}
        </button>
      </form>
    </motion.div>
  )
}

function Required() {
  return (
    <span className="ml-1 text-xs text-berry-500" aria-label="必須">
      必須
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-cozy border border-cream-200 bg-white p-6 shadow-soft">
      <h2 className="font-bold text-bark-800">{title}</h2>
      {children}
    </section>
  )
}

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  maxLength?: number
  placeholder?: string
  inputMode?: 'text' | 'decimal'
  hint?: string
  error?: string
}

function TextField({ id, label, value, onChange, required, error, hint, ...rest }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-bark-600">
        {label}
        {required && <Required />}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`mt-1.5 w-full rounded-cozy border px-4 py-2.5 text-bark-800 transition-colors focus:outline-none focus:ring-3 ${
          error
            ? 'border-berry-500 focus:ring-berry-500/20'
            : 'border-cream-300 focus:border-leaf-400 focus:ring-leaf-100'
        }`}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-berry-500">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-bark-400">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

interface TextAreaFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  maxLength?: number
  hint?: string
  error?: string
}

function TextAreaField({ id, label, value, onChange, maxLength, hint, error }: TextAreaFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-bark-600">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        rows={4}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1.5 w-full rounded-cozy border border-cream-300 px-4 py-3 text-bark-800 transition-colors focus:border-leaf-400 focus:outline-none focus:ring-3 focus:ring-leaf-100"
      />
      {error ? (
        <p className="mt-1 text-xs text-berry-500">{error}</p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-bark-400">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
