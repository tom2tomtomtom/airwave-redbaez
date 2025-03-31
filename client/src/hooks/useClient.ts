import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { fetchClients, selectClient } from '../store/slices/clientSlice';

interface Client {
  id: string;
  name: string;
  logo?: string;
}

export const useClient = () => {
  const dispatch = useDispatch();
  const { clients, selectedClientId, loading, error } = useSelector(
    (state: RootState) => state.clients
  );
  const [availableClients, setAvailableClients] = useState<Client[]>([]);

  useEffect(() => {
    if (clients.length === 0 && !loading) {
      dispatch(fetchClients());
    } else {
      setAvailableClients(clients);
    }
  }, [dispatch, clients, loading]);

  const handleClientChange = (clientId: string) => {
    dispatch(selectClient(clientId));
  };

  return {
    clients: availableClients,
    selectedClientId,
    loading,
    error,
    setSelectedClient: handleClientChange,
  };
};
