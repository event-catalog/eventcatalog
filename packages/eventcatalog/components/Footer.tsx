import React from 'react'
import { useConfig } from '@/hooks/EventCatalog'

const Footer = () => {
  const { organizationName } = useConfig()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-800 py-10">
      <div className="mt-8 md:mt-0 md:order-1">
        <p className="text-center text-base text-gray-400">
          Copyright © {year} {organizationName}. Built with EventCatalog.
        </p>
      </div>
    </footer>
  )
}

export default Footer
