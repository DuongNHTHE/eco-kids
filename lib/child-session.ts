export const CHILD_SESSION_KEY = 'eco-child-id';

export type SelectedChild = {
    id: string;
    name: string;
};

export function getSelectedChildId() {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(CHILD_SESSION_KEY);
}

export function saveSelectedChild(child: SelectedChild) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CHILD_SESSION_KEY, child.id);
    window.localStorage.setItem('eco-child', child.name);
    window.dispatchEvent(new Event('eco-child-changed'));
}

export function clearSelectedChild() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(CHILD_SESSION_KEY);
    window.localStorage.removeItem('eco-child');
}