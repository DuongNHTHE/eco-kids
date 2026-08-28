import { useRouter } from "next/navigation";
import { useRef, useMemo } from "react";
import { toast } from "sonner";
import { useLoading } from "./useLoading";
import { API_URL, MESSAGE } from "../../config/constant";

export function useAPI() {
    const router = useRouter();
    const { showLoading, hideLoading } = useLoading();

    // Stable refs so the memoized API object never holds stale closures
    const routerRef = useRef(router);
    const showLoadingRef = useRef(showLoading);
    const hideLoadingRef = useRef(hideLoading);
    routerRef.current = router;
    showLoadingRef.current = showLoading;
    hideLoadingRef.current = hideLoading;

    // Create API once — all internal calls go through refs to stay current
    const API = useMemo(() => {
        const handleErrorResponse = async (response: any, showToast: boolean = true, parsedBody?: any): Promise<any> => {
            try {
                let message = "Error";
                let status = response?.status;
                let responseData: any = {};

                if (response instanceof Error) {
                    message = response.message || MESSAGE.DISCONNECTED;
                    responseData = { success: false, message };
                } else {
                    try {
                        responseData = parsedBody ?? await response.json();
                    } catch {
                        responseData = { success: false };
                    }

                    if (typeof responseData?.message === "string" && responseData.message.trim()) {
                        message = responseData.message;
                    } else if (typeof responseData?.error === "string" && responseData.error.trim()) {
                        message = responseData.error;
                    } else {
                        message = response?.statusText || "Error";
                    }

                    switch (status) {
                        case 401:
                            message = MESSAGE.UNAUTHORIZED;
                            if (!localStorage.getItem("ru")) localStorage.setItem("ru", window.location.pathname + window.location.search);
                            routerRef.current.push("/login");
                            break;
                        case 403:
                            message = MESSAGE.FORBIDDEN;
                            break;
                        case 404:
                            message = MESSAGE.NOT_FOUND;
                            break;
                        case 500:
                            message = MESSAGE.SERVER_ERROR;
                            break;
                    }
                }

                if (showToast) {
                    toast.error(message);
                }

                responseData.success = false;
                responseData.message = message;
                responseData.status = status;
                return responseData;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : MESSAGE.DISCONNECTED;
                if (showToast) {
                    toast.error(errorMessage);
                }
                return { success: false, message: errorMessage };
            }
        };

        const request = async (
            method: string,
            url: string,
            data: any = {},
            showToastSuccess: boolean = false,
            showToastError: boolean = true,
            showLoadingUI: boolean = true,
        ): Promise<any> => {
            url = url.startsWith("/") ? url.slice(1) : url;
            const token = localStorage.getItem("t");

            const headers: any = {
                ...token && { Authorization: `Bearer ${token}` },
                'X-Permission-Version': localStorage.getItem('p_version'),
                ...(!(data instanceof FormData) && { 'Content-Type': 'application/json' }),
            };

            try {
                if (showLoadingUI) {
                    showLoadingRef.current();
                }

                const isBodylessMethod = method === 'GET' || method === 'DELETE';
                const body = isBodylessMethod ? null : data instanceof FormData ? data : JSON.stringify(data);

                const response = await fetch(`${API_URL}/api/${url}`, {
                    method,
                    headers,
                    body,
                });

                if (!response.ok) {
                    const responseData = await response.json().catch(() => ({}));

                    if (responseData?.type == 'permission_old') {
                        localStorage.setItem('p', JSON.stringify(responseData?.data?.original.data.permissions || []));
                        localStorage.setItem('p_version', responseData?.data?.original.data.permission_version || '');

                        window.location.reload();
                        toast.success("Permissions updated. Reloading...");
                    }

                    return handleErrorResponse(response, showToastError, responseData);
                }

                const responseData = await response.json();

                if (showToastSuccess) {
                    toast.success(responseData.message || "Success");
                }

                responseData.success = true;
                return responseData;
            } catch (error) {
                return handleErrorResponse(error, showToastError);
            } finally {
                if (showLoadingUI) {
                    hideLoadingRef.current();
                }
            }
        };

        return {
            get: (url: string, showToastSuccess = true, showToastError = true, showLoading = true): Promise<any> =>
                request('GET', url, {}, showToastSuccess, showToastError, showLoading),
            post: (url: string, data: any = {}, showToastSuccess = true, showToastError = true, showLoading = true): Promise<any> =>
                request('POST', url, data, showToastSuccess, showToastError, showLoading),
            put: (url: string, data: any = {}, showToastSuccess = true, showToastError = true, showLoading = true): Promise<any> =>
                request('PUT', url, data, showToastSuccess, showToastError, showLoading),
            delete: (url: string, data: any = {}, showToastSuccess = true, showToastError = true, showLoading = true): Promise<any> =>
                request('DELETE', url, data, showToastSuccess, showToastError, showLoading),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { API };
}
