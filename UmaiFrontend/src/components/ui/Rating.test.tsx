import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Rating } from './Rating'

describe('Rating', () => {
  it('shows the average and review count when reviews exist', () => {
    render(<Rating averageRating={4.6} reviewCount={18} />)

    expect(screen.getByText('4.6')).toBeInTheDocument()
    expect(screen.getByText('(18件)')).toBeInTheDocument()
  })

  it('says there is no rating yet rather than showing 0.0', () => {
    // An unrated restaurant is not a badly rated one — showing 0.0 would libel it.
    render(<Rating averageRating={null} reviewCount={0} />)

    expect(screen.getByText('まだ評価がありません')).toBeInTheDocument()
    expect(screen.queryByText('0.0')).not.toBeInTheDocument()
  })

  it('rounds to one decimal place', () => {
    render(<Rating averageRating={4.25} reviewCount={4} />)

    expect(screen.getByText('4.3')).toBeInTheDocument()
  })

  it('exposes the rating to assistive technology, not just as a star glyph', () => {
    render(<Rating averageRating={3.5} reviewCount={2} />)

    expect(screen.getByText('5点満点中3.5点、レビュー2件')).toBeInTheDocument()
  })
})
