import { Navbar, Footer } from '@/components/layout'
import { ReactNode } from 'react'

type Props = {
    children: ReactNode
}

const Layout = ({ children }: Props) => {
  return (
    <div>
        <Navbar />
        <main className="flex-grow ">
            {children}
        </main>
        <Footer />
    </div>
  )
}

export default Layout