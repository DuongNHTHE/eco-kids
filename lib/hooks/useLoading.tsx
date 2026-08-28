'use client'

import { useEffect, useState } from "react";

export function useLoading() {
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        const loadingElement = document.querySelector('#loadingIndicator') as HTMLElement;
        if (loadingElement) {
            if (isLoading) {
                loadingElement.classList.remove('hidden');
            } else {
                loadingElement.classList.add('hidden');
            }
        }
    }, [isLoading]);

    const showLoading = () => {
        setIsLoading(true);
    }

    const hideLoading = () => {
        setIsLoading(false);
    }

    return { showLoading, hideLoading };
}