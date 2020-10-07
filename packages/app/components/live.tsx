// LiveRouteEntry.tsx
import React from 'react';
import { mutate } from 'swr';
import Form from 'react-bootstrap/Form';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button';
import Tooltip from 'react-bootstrap/Tooltip';
import Overlay from 'react-bootstrap/Overlay';
import {
  TunnelRouteIdentifier,
  TunnelRouteEntry,
  TunnelState
} from 'core/lib/constants';

type LiveRouteProps = {
  route: TunnelRouteEntry
}

type LiveRouteState = {
  persist: boolean,
  disabled: boolean,
  timeoutId: NodeJS.Timeout | null,
  modeChangeRef: React.RefObject<HTMLInputElement>,
}

enum ActionType {
  RESTART = 'restart',
  SHUTDOWN = 'shutdown',
  DELETE = 'delete'
}

export default class LiveRouteEntry extends React.Component<LiveRouteProps, LiveRouteState> {
  constructor (props: LiveRouteProps) {
    super(props);

    this.state = {
      persist: props.route.config.persist || false,
      disabled: false,
      timeoutId: null,
      modeChangeRef: React.createRef()
    };
  }

  private _enableActionCoundown (): void {
    // Disable delete button for at least 10 seconds after adding
    const timeoutId: NodeJS.Timeout = setTimeout(() => this.setState({
      disabled: false
    }), 10000);
    this.setState({
      timeoutId
    });
  }

  public componentDidMount (): void {
    this.setState({
      disabled: true
    });
    this._enableActionCoundown();
  }

  public componentWillUnmount(): void {
    if (this.state.timeoutId) {
      clearTimeout(this.state.timeoutId);
    }
  }

  public _commitTunnelAction (routeId: TunnelRouteIdentifier, action: ActionType) {
    return async (e: React.MouseEvent<HTMLElement, MouseEvent>): Promise<void> => {
      e.preventDefault();
      
      this.setState({
        disabled: true
      });

      let res;
  
      try {
        res = await fetch(`/api/tunnel/${routeId}${action === ActionType.DELETE ? '?remove=true' : `?persist=${this.state.persist}`}`, {
          method: action === ActionType.DELETE || action === ActionType.SHUTDOWN ? 'DELETE' : 'PATCH' 
        });
      } catch (err) {
        // TODO: handle error
        console.error(err);
        return;
      }
  
      if (res.ok) {
        // Notify change
        mutate('/api/tunnels');
        this._enableActionCoundown();
      }
    }
  }

  private _togglePersistance (): void {
    this.setState({
      persist: !this.state.persist
    })
  }

  public render (): React.ReactElement {
    const route: TunnelRouteEntry = this.props.route;
    return (
      <tr>
        <td>{route.config.name}</td>
        <td>{route.config.originURL}</td>
        <td>
          { route.state === TunnelState.DISABLED ? (<div>-</div>) : (<a href={route.config.publicURL} target="_blank">{route.config.publicURL}</a>) }
        </td>
        <td>
          <ButtonGroup size="sm" aria-label="Route actions">
            { route.state === TunnelState.ACTIVE ? (
              <Button variant="warning" onClick={this._commitTunnelAction(route.config.id, ActionType.SHUTDOWN).bind(this)} disabled={this.state.disabled}>
                Shutdown
              </Button>
              ) : (route.state === TunnelState.DISABLED ? (
                <Button variant="success" onClick={this._commitTunnelAction(route.config.id, ActionType.RESTART).bind(this)} disabled={this.state.disabled}>
                  Reboot
                </Button>
              ) : null) 
            }
            <Button variant="danger" onClick={this._commitTunnelAction(route.config.id, ActionType.DELETE).bind(this)} disabled={this.state.disabled}>
              Delete
            </Button>
          </ButtonGroup>
        </td>
        <td>
          <Form>
            <>
              <Form.Check 
                type="switch"
                id="enable-persistance"
                ref={this.state.modeChangeRef}
                label={this.state.persist ? 'Enabled' : 'Disabled'}
                checked={this.state.persist}
                onChange={this._togglePersistance.bind(this)}
                disabled={route.state === TunnelState.ACTIVE}
              />
              <Overlay target={this.state.modeChangeRef.current} show={this.props.route.config.persist !== this.state.persist} placement="bottom">
                {(props) => (
                <Tooltip id="overlay-example" {...props}>
                  Change goes into effect next reboot
                </Tooltip>
                )}
              </Overlay>
            </>
          </Form>
        </td>
      </tr>
    );
  }
}
