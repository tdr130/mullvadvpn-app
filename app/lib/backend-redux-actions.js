import userActions from '../actions/user';
import connectActions from '../actions/connect';
import Backend from './backend';
import { LoginState, ConnectionState } from '../enums';

export default function mapBackendEventsToReduxActions(backend, store) {
  const onUpdateIp = (clientIp) => {
    store.dispatch(connectActions.connectionChange({ clientIp }));
  };

  const onUpdateLocation = (data) => {
    store.dispatch(userActions.loginChange(data));
  };

  const onConnecting = (serverAddress) => {
    store.dispatch(connectActions.connectionChange({ 
      status: ConnectionState.connecting,
      error: null,
      serverAddress
    }));
  };

  const onConnect = (serverAddress, error) => {
    const status = error ? ConnectionState.disconnected : ConnectionState.connected;
    store.dispatch(connectActions.connectionChange({ error, status }));
  };

  const onDisconnect = () => {
    store.dispatch(connectActions.connectionChange({
      status: ConnectionState.disconnected,
      serverAddress: null, 
      error: null
    }));
  };

  const onLoggingIn = (info) => {
    store.dispatch(userActions.loginChange(Object.assign({ 
      status: LoginState.connecting, 
      error: null
    }, info)));
  };

  const onLogin = (info, error) => {
    const status = error ? LoginState.failed : LoginState.ok;
    const paidUntil = info.paidUntil ? info.paidUntil : null;
    store.dispatch(userActions.loginChange({ paidUntil, status, error }));
  };

  const onLogout = () => {
    store.dispatch(userActions.loginChange({
      status: LoginState.none, 
      account: null,
      paidUntil: null,
      error: null
    }));
  };

  backend.on(Backend.EventType.updatedIp, onUpdateIp);
  backend.on(Backend.EventType.updatedLocation, onUpdateLocation);
  backend.on(Backend.EventType.connecting, onConnecting);
  backend.on(Backend.EventType.connect, onConnect);
  backend.on(Backend.EventType.disconnect, onDisconnect);
  backend.on(Backend.EventType.logging, onLoggingIn);
  backend.on(Backend.EventType.login, onLogin);
  backend.on(Backend.EventType.logout, onLogout);
}