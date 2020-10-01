// LiveRouteEntry.tsx
import React from 'react';
import { mutate } from 'swr';
import { 
  TunnelRouteConfiguration, 
  TunnelRouteIdentifier 
} from 'core';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button';

type LiveRouteProps = {
  route: TunnelRouteConfiguration
}

const _deleteTunnel = async (routeId: TunnelRouteIdentifier) => {
  // Deletes tunnel entry
  let res: any;

  try {
    res = await fetch(`/api/tunnel/${routeId}`, {
      method: 'DELETE'
    });
  } catch (err) {
    // TODO: handle error
    return console.error(err);
  }

  if (res.ok === 204) {
    // Notify change
    mutate('/api/tunnels');
  }
}

export default function LiveRouteEntry (props: LiveRouteProps) {
  const [disabled, setDisabled] = React.useState(true);
  const route: TunnelRouteConfiguration = props.route;
  const name: string = route.id.split('_')[0];

  // Disable delete button for at least 25 seconds after adding
  React.useEffect(() => {
    const timeoutId: NodeJS.Timeout = setTimeout(() => setDisabled(false), 25000); // 25 seconds
    // Add cleanup for unmount
    return function cleanup () {
      clearTimeout(timeoutId);
    }
  });

  return (
    <tr>
      <td>{name}</td>
      <td>{route.originURL}</td>
      <td>
        <a href={route.publicURL} target="_blank">{route.publicURL}</a>
      </td>
      <td>
        <ButtonGroup size="sm" aria-label="Route actions">
          <Button variant="secondary" onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => {
            e.preventDefault();
            setDisabled(true);
            _deleteTunnel(route.id);
          }} disabled={disabled}>Delete</Button>
        </ButtonGroup>
      </td>
    </tr>
  );
}
