import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Rating } from './Rating'
import { renderWithProviders } from '../../test/renderWithProviders'

describe('Rating', () => {
  it('shows the average and review count when reviews exist', () => {
    renderWithProviders(<Rating averageRating={4.6} reviewCount={18} />)

    expect(screen.getByText('4.6')).toBeInTheDocument()
    expect(screen.getByText('(18件)')).toBeInTheDocument()
  })

  it('falls back to the Google rating when there are no local reviews', () => {
    renderWithProviders(<Rating averageRating={null} reviewCount={0} googleRating={4.2} googleRatingCount={310} />)

    expect(screen.getByText('4.2')).toBeInTheDocument()
    expect(screen.getByText('(310件)')).toBeInTheDocument()
    expect(screen.getByText('Google')).toBeInTheDocument()
  })

  it('says there is no rating yet rather than showing 0.0', () => {
    // An unrated restaurant is not a badly rated one — showing 0.0 would libel it.
    renderWithProviders(<Rating averageRating={null} reviewCount={0} />)

    expect(screen.getByText('評価はまだありません')).toBeInTheDocument()
    expect(screen.queryByText('0.0')).not.toBeInTheDocument()
  })

  it('rounds to one decimal place', () => {
    renderWithProviders(<Rating averageRating={4.25} reviewCount={4} />)

    expect(screen.getByText('4.3')).toBeInTheDocument()
  })

  it('exposes the rating to assistive technology, not just as a star glyph', () => {
    renderWithProviders(<Rating averageRating={3.5} reviewCount={2} />)

    expect(screen.getByText('3.5 / 5 · 2件')).toBeInTheDocument()
  })
})
