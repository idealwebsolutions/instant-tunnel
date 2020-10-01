// Navigation.tsx
import Link from 'next/link';
import Navbar from 'react-bootstrap/Navbar';
import NavbarBrand from 'react-bootstrap/NavbarBrand';
import {
  GrDeploy
} from 'react-icons/gr';

export default function Navigation () {
  return (
  <Navbar bg="warning">
    <Link href="/" passHref>
      <NavbarBrand>
      <>
        <style type="text/css">
        {`
          svg {
            margin-right: 2px;
          }
        `}
        </style>
          <GrDeploy /> Instant Tunnel
        </>
      </NavbarBrand>
    </Link>
  </Navbar>
  )
}
