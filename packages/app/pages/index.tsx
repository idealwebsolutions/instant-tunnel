import React from 'react';
import useSWR from 'swr';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { version } from '../../app/package.json';
import Header from '../components/header';
import Navigation from '../components/navigation';
import AddRouteForm from '../components/add';
import LiveRouteEntry from '../components/live';
// Icons
import {
  GrAlert,
  GrCircleInformation,
  GrTechnology,
  GrDocumentMissing
} from 'react-icons/gr'; 
import styles from '../styles/Dashboard.module.css'
import { constants } from 'core';

type EmptyProps = Record<string, unknown>;

function AboutPane (): React.FunctionComponentElement<EmptyProps> {
  return (
    <Col className="py-1">
      <Row>
        <Col>
          <h1 className="text-center">Version {version}</h1>
        </Col>
      </Row>
      <Row>
        <Col>
          <p><strong>Instant Tunnel</strong> is a high level service that utilizes Cloudflare's Argo Tunnel (free tier) capabilities to get your services online faster than ever without ever touching a private server.</p>
          <p>In this dashboard you can <strong>view, create and manage</strong> various tunnel instances without ever having to touch the console. These are defined as <strong>routes</strong>.</p>
          <p>All you need are local addresses to point to services you wish to be public. Cloudflare Argo takes care of the rest without having to install additional software.</p>
          <p>Local web services can stay live as long they remain online, background tasks are used to keep track of connectivity. <strong>Please note that only HTTP(S) services are supported at this time.</strong></p>
          <p>Check out the <strong>Dockerfile</strong> at the top level of this repository to get up and running quickly on your local machine.</p>
        </Col>
      </Row>
    </Col>
  );
}

function RouteSettingsPane (): React.FunctionComponentElement<EmptyProps> {
  const { data, error } = useSWR(`/api/tunnels`);

  if (error) {
    return (
      <Jumbotron className="text-center">
        <GrAlert size="3em" />
        <h1 className="text-center">Error occured fetching routes. Please refresh page to try again.</h1>
      </Jumbotron>
    );
  }

  if (!data) {
    return (
      <Spinner animation="grow" role="status">
        <span className="sr-only">Loading...</span>
      </Spinner>
    );
  }

  const routes: Array<constants.TunnelRouteEntry> = data.routes;
  
  return (
    <Col className="py-1">
      <Row noGutters>
        <Col>
          <AddRouteForm />
        </Col>
      </Row>
      <Row>
        <Col>
          { !routes.length ? 
          (
            <Jumbotron className="text-center">
              <GrDocumentMissing size="3em" />
              <h1>No routes were found.</h1>
            </Jumbotron>
          ) : 
          (
            <Table hover striped bordered responsive>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Origin</th>
                  <th>Public URL</th>
                  <th>Actions</th>
                  <th>Persistance</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route: constants.TunnelRouteEntry) => 
                  <LiveRouteEntry key={route.config.id} route={route} />
                )}
              </tbody>
            </Table>
          )}
        </Col>
      </Row>
    </Col>
  );
}

export default function Dashboard (): React.FunctionComponentElement<EmptyProps> {
  const [selectedPane, setPane] = React.useState('about');

  return (
    <div>
      <Header pageTitle="Management"></Header>
      <Navigation></Navigation>
      <Container as="main" fluid>
        <Row noGutters>
          <Col md={2}>
            <div className={styles['sticky-sidebar']}>
              <Nav as="nav" defaultActiveKey="about" className="flex-column" onSelect={
                (eventKey: string | null) => setPane(eventKey || 'about')}>
                <Nav.Item>
                  <>
                    <style type="text/css">
                    {`
                      .nav-link {
                        color: #1c1c1c;
                      }
                      .nav-link:hover {
                        color: #6E6E6E;
                      }
                      .active {
                        background-color: rgba(100, 100, 100, 0.2);
                      }
                    `}
                    </style>
                    <Nav.Link eventKey="about">
                      <GrCircleInformation /> About
                    </Nav.Link>
                  </>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="routes">
                    <GrTechnology /> Routes
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </div>
          </Col>
          <Col>
            {selectedPane === 'about' ? <AboutPane /> : <RouteSettingsPane />}
          </Col>
        </Row>
      </Container>
      <footer>
      </footer>
    </div>
  )
}
