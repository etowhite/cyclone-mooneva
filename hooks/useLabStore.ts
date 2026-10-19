import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ensureLoaded, getSnapshot, labActions, subscribe } from '../services/lab/store';

/** Lab state for Lab UI. Loads the Lab data on first use. */
export const useLab = () => {
    const { status, data } = useSyncExternalStore(subscribe, getSnapshot);
    useEffect(() => { void ensureLoaded(); }, []);
    return useMemo(() => ({ status, data, actions: labActions }), [status, data]);
};
