import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { RestaurantCard } from './RestaurantCard'
import { makeRestaurant } from '../../test/fixtures'

function renderCard(overrides = {}) {
  return render(
    <MemoryRouter>
      <RestaurantCard restaurant={makeRestaurant(overrides)} />
    </MemoryRouter>,
  )
}

describe('RestaurantCard', () => {
  it('shows the name, diet classification, category, area and price', () => {
    renderCard()

    expect(screen.getByText('みどりの木キッチン')).toBeInTheDocument()
    expect(screen.getByText('ヴィーガン専門')).toBeInTheDocument()
    expect(screen.getByText('和食')).toBeInTheDocument()
    expect(screen.getByText('新宿')).toBeInTheDocument()
    expect(screen.getByText('¥¥')).toBeInTheDocument()
  })

  it('links to the restaurant detail page', () => {
    renderCard({ id: 42 })

    expect(screen.getByRole('link')).toHaveAttribute('href', '/restaurants/42')
  })

  describe('missing data', () => {
    it('omits the price entirely when unknown, rather than showing a placeholder', () => {
      renderCard({ priceRange: null })

      expect(screen.queryByText('¥')).not.toBeInTheDocument()
      expect(screen.queryByText('¥¥')).not.toBeInTheDocument()
      expect(screen.queryByText(/不明/)).not.toBeInTheDocument()
    })

    it('omits the description when absent', () => {
      renderCard({ description: null })

      expect(screen.queryByText(/野菜と豆/)).not.toBeInTheDocument()
    })

    it('omits the area when absent', () => {
      renderCard({ area: null })

      expect(screen.queryByText('新宿')).not.toBeInTheDocument()
    })

    it('renders a decorative placeholder instead of a broken image', () => {
      renderCard({ imageUrl: null })

      // No <img> at all — a missing photo must not become a broken image icon.
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('renders the image when one is available', () => {
      renderCard({ imageUrl: 'https://example.com/photo.jpg' })

      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('src', 'https://example.com/photo.jpg')
      expect(image).toHaveAccessibleName('みどりの木キッチン')
    })

    it('still renders a usable card when almost everything is missing', () => {
      renderCard({
        description: null,
        address: null,
        priceRange: null,
        area: null,
        imageUrl: null,
        categories: [],
        averageRating: null,
        reviewCount: 0,
      })

      expect(screen.getByText('みどりの木キッチン')).toBeInTheDocument()
      expect(screen.getByText('まだ評価がありません')).toBeInTheDocument()
    })
  })
})
