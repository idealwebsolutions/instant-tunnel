// AddRouteForm.tsx
import React from 'react';
import { mutate } from 'swr';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import { 
  TunnelRouteConfigurationRequest,
} from 'core';

import {
  GrPlay
} from 'react-icons/gr';

type AddRouteFormState = {
  name?: string,
  originURL?: string,
  activatedTunnelId?: string | null,
  showAlert?: boolean,
  success?: boolean,
  errorMessage?: string | null,
  disabled?: boolean,
  validated?: boolean,
  expiringTimeoutId?: NodeJS.Timeout | null
}

type AddRouteProps = Record<string, unknown>;

type AddRouteResponseData = {
  tunnelId: string
}
type ErrorResponseData = {
  error: string
}

export default class AddRouteForm extends React.Component<AddRouteProps, AddRouteFormState> {
  public state: AddRouteFormState;

  constructor (props: AddRouteProps) {
    super(props);

    this.state = {
      name: '',
      originURL: '',
      activatedTunnelId: null,
      success: false,
      errorMessage: null,
      showAlert: false,
      disabled: true,
      expiringTimeoutId: null,
      validated: false,
    };
  }

  private _handleUpdate (key: string) {
    return (e: React.ChangeEvent<any>) => {
      e.preventDefault();
      const name: string = this.state.name || '';
      const originURL: string = this.state.originURL || '';
      let unsetOccured = false;
      // If a timer was active previously, unset
      if (this.state.expiringTimeoutId) {
        clearTimeout(this.state.expiringTimeoutId);
        unsetOccured = true;
      }
      // Set next state after change occurs
      const nextState: AddRouteFormState = Object.freeze({
        [key]: e.target.value,
        disabled: !name.length || !originURL.length,
        expiringTimeoutId: unsetOccured ? null : this.state.expiringTimeoutId
      });
      this.setState(nextState);
    }
  }

  private async _create (e: React.FormEvent<HTMLFormElement>): Promise<void> {
    const name: string = this.state.name || '';
    const originURL: string = this.state.originURL || 'localhost:8080';

    e.preventDefault();
    
    if (e.currentTarget.checkValidity()) {
      e.stopPropagation();
      if (!/^[a-zA-Z0-9-]+$/.test(name)) {
        this.setState({
          name: '',
          validated: true
        });
        return;
      }
      if (!/^\S+:\d+$/.test(originURL)) {
        this.setState({
          originURL: '',
          validated: true
        });
        return;
      }
    }
    
    this.setState({
      disabled: true
    });
    
    this._resetAlert();

    const config: TunnelRouteConfigurationRequest = Object.freeze({
      name,
      originURL
    });

    let res: any;
    
    try {
      res = await fetch('/api/tunnels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config),
      });
    } catch (err) {
      console.error(err);
      return;
    }

    const alertOffTimeout: NodeJS.Timeout = setTimeout(() => {
      this._resetAlert();
      mutate('/api/tunnels');
    }, 25000); // expire after 25 seconds

    if (!res.ok) {
      let data: ErrorResponseData;
      try {
        data = await res.json();
      } catch (err) {
        // TODO: handle error
        console.error(err);
        return;
      }  
      this.setState({
        errorMessage: data.error,
        showAlert: true,
        expiringTimeoutId: alertOffTimeout,
      });
      return;
    }

    let data: AddRouteResponseData;
    
    try {
      data = await res.json();
    } catch (err) {
      return console.error(err);
    }

    const activatedTunnelId: string = data.tunnelId;

    this.setState({
      name: '',
      originURL: '',
      activatedTunnelId,
      success: res.ok,
      showAlert: true,
      errorMessage: null,
      expiringTimeoutId: alertOffTimeout,
      validated: false
    });

    mutate('/api/tunnels');
  }

  private _resetAlert (): void {
    this.setState({
      success: false,
      showAlert: false,
    });
  }

  public render (): React.ReactElement {
    return (
      <Form noValidate validated={this.state.validated} onSubmit={this._create.bind(this)}>
        { this.state.showAlert ? (
          <Form.Row>
            <Col>
              <Alert variant={this.state.success ? 'success' : 'danger'} onClick={this._resetAlert.bind(this)} dismissible>
                <Alert.Heading>
                  { this.state.success ? 'Success'  : 'Failed' }
                </Alert.Heading>
                { 
                  this.state.success ? 
                  <p>Tunnel (<strong>{this.state.activatedTunnelId}</strong>) is now activating, please wait a moment for results to refresh.</p> : 
                  <p>Error occured while trying to activate the tunnel: <strong>{this.state.errorMessage}</strong></p>
                }
              </Alert>
            </Col>
          </Form.Row> ) : null 
        }
        <Form.Row>
          <Form.Group as={Col} xs={5} controlId="validationName">
            <Form.Control required type="text" value={this.state.name} onChange={this._handleUpdate('name')} size="lg" placeholder="Name (ex: my-random-webserver)" />
            <Form.Control.Feedback type="invalid">Invalid format. Name must be at least 3 letters and only may contain dashes</Form.Control.Feedback>
          </Form.Group>
          <Form.Group as={Col} xs={5} controlId="validationOriginURL">
            <Form.Control required type="text" value={this.state.originURL} onChange={this._handleUpdate('originURL')} size="lg" placeholder="Origin (ex: localhost:8080)" />
            <Form.Control.Feedback type="invalid">Invalid format. Origin must be in hostname:port pattern</Form.Control.Feedback>
          </Form.Group>
          <Col>
            <Button variant="outline-dark" size="lg" type="submit" disabled={this.state.disabled} block>
              <GrPlay />
            </Button>
          </Col>
        </Form.Row>
      </Form>
    );
  }
}
