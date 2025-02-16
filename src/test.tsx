import React, {Context} from 'react';
import {act} from 'react-dom/test-utils';
import {HelmetProvider} from 'react-helmet-async';
import {MemoryRouter, MemoryRouterProps} from 'react-router-dom';
import {toSnake, ToSnake} from 'ts-case-convert/lib/caseConvert';

import {DirectionProvider, ToastNotificationType} from '@veneer/core';
import ToastContext from '@veneer/core/dist/scripts/toast_container/toast_context';

import {PartnerGroup, ProductType, TenantPermission} from '@br/idm-api';
import {
    BuyOrRedeemLicenseContext,
    GlobalTranslationsProvider,
    IntlFormatProvider,
    RefreshableTableProvider,
    TenantContext,
    k,
    TenantUserContext,
    CustomerApiProvider,
} from '@br/idm-components';

import {PartnerContext} from '../../contexts/PartnerContext';
import {SettingsContext, SettingsType} from '../../contexts/SettingsContext';
import {UserContext} from '../../contexts/UserContext';
import type {UserContextType} from '../../types';
import {PartnerGroupFactory, TenantDetailFactory, UserContextFactory} from '../factories';
import {SettingsContextFactory} from '../factories/settings';

type ContextType<C> = C extends Context<infer T> ? T : never;

export const makeTestTenantUserContext = (
    tenantId: string,
    permissions?: TenantPermission[]
): ContextType<typeof TenantUserContext> => ({
    tenantId,
    hasPermission(permission: TenantPermission) {
        return permissions === undefined ? true : permissions.includes(permission);
    },
});

export const makeTestTenantContext = (tenantId?: string): ContextType<typeof TenantContext> => ({
    tenant: TenantDetailFactory.build({id: tenantId}),
    updateTenant: jest.fn(),
});

export const mockToast = jest.fn<undefined, [ToastNotificationType]>();

export type TestHarnessProps = React.PropsWithChildren<{
    initialEntries?: MemoryRouterProps['initialEntries'];
    userContext?: UserContextType;
    rtl?: boolean;
    settingsContext?: SettingsType;
}>;

export const TestHarness = ({
    children,
    initialEntries,
    userContext = UserContextFactory.build(),
    rtl = false,
    settingsContext = SettingsContextFactory.build(),
}: TestHarnessProps): JSX.Element => {
    return (
        <HelmetProvider>
            <GlobalTranslationsProvider>
                <DirectionProvider>
                    <IntlFormatProvider
                        locale="en"
                        timeZone="Europe/London"
                        rtl={rtl}
                    >
                        <MemoryRouter initialEntries={initialEntries}>
                            <ToastContext.Provider
                                value={{
                                    addToast: mockToast,
                                    toasts: [],
                                    removeToast: jest.fn(),
                                    updateToast: jest.fn(),
                                }}
                            >
                                <CustomerApiProvider>
                                    <SettingsContext.Provider value={settingsContext}>
                                        <UserContext.Provider value={userContext}>{children}</UserContext.Provider>
                                    </SettingsContext.Provider>
                                </CustomerApiProvider>
                            </ToastContext.Provider>
                        </MemoryRouter>
                    </IntlFormatProvider>
                </DirectionProvider>
            </GlobalTranslationsProvider>
        </HelmetProvider>
    );
};

export const TenantTestHarness = ({
    tenantId = 'tenantid',
    tenant = makeTestTenantContext(tenantId),
    userContext = UserContextFactory.build(),
    settingsContext = SettingsContextFactory.build(),
    permissions,
    showBuyRedeemLinks = true,
    children,
}: React.PropsWithChildren<{
    tenantId?: string;
    tenant?: ContextType<typeof TenantContext>;
    userContext?: UserContextType;
    settingsContext?: SettingsType;
    permissions?: TenantPermission[];
    showBuyRedeemLinks?: boolean;
}>): JSX.Element => {
    const buyLicenseUrl = 'https://www.hpwolf.com/buy';
    const redeemLicenseUrl = '/portal/activate/';
    return (
        <TestHarness
            userContext={userContext}
            settingsContext={settingsContext}
        >
            <RefreshableTableProvider>
                <TenantContext.Provider value={tenant}>
                    <TenantUserContext.Provider value={makeTestTenantUserContext(tenant.tenant.id, permissions)}>
                        <BuyOrRedeemLicenseContext.Provider
                            value={{
                                buyLicenseUrl,
                                redeemLicenseUrl,
                                showBuyRedeemLinks,
                            }}
                        >
                            {children}
                        </BuyOrRedeemLicenseContext.Provider>
                    </TenantUserContext.Provider>
                </TenantContext.Provider>
            </RefreshableTableProvider>
        </TestHarness>
    );
};

export const SupportTestHarness = ({
    userContext = UserContextFactory.build({isSupportUser: true}),
    showBuyRedeemLinks = true,
    children,
}: React.PropsWithChildren<{userContext?: UserContextType; showBuyRedeemLinks?: boolean}>): JSX.Element => {
    const buyLicenseUrl = 'https://www.hpwolf.com/buy';
    const redeemLicenseUrl = '/portal/activate/';
    return (
        <TestHarness userContext={userContext}>
            <RefreshableTableProvider>
                <BuyOrRedeemLicenseContext.Provider
                    value={{
                        buyLicenseUrl,
                        redeemLicenseUrl,
                        showBuyRedeemLinks,
                    }}
                >
                    {children}
                </BuyOrRedeemLicenseContext.Provider>
            </RefreshableTableProvider>
        </TestHarness>
    );
};

export const PartnerTestHarness = ({
    children,
    partner = PartnerGroupFactory.build(),
}: {
    children: React.ReactNode;
    partner?: PartnerGroup;
}): JSX.Element => {
    return (
        <TestHarness>
            <PartnerContext.Provider value={{partner}}>{children}</PartnerContext.Provider>
        </TestHarness>
    );
};

/**
 * ApiToSnake converts a type for something like this:
 *
 * interface Mumble {
 *     myProperty: string
 * }
 *
 * To something like this:
 *
 * interface Mumble {
 *     my_property: string
 * }
 *
 * Recursively, and handling arrays.
 *
 * The need from this arises from wanting to have accurate types for our mocked
 * server responses in tests. To make the prod code idiomatic, the generated
 * client converts the snake_case api models into camelCase typescript models.
 * This just turns them back :)
 */
export type ApiToSnake<T> = {[K in keyof T as ToSnake<K>]: ApiToValue<T[K]>};

// If you infer the type of T = AnEnum[] extends Array<infer AT> then T becomes
// AnEnum.A[] | AnEnum.B[] | AnEnum.C[] which is obviously. If we detect we're
// working on an enum, bypass inference. Add to this list as you get errors.
// Answers on 'how to detect enums in typescript' on a postcard.
type SomeEnum = ProductType | TenantPermission;

export type ApiToValue<V> = V extends SomeEnum[]
    ? V
    : V extends Array<infer ArrayType>
      ? ArrayType extends object
          ? Array<ApiToSnake<ArrayType>>
          : Array<ArrayType>
      : V extends Date
        ? string
        : V extends object
          ? ApiToSnake<V>
          : V;

// For use with msw server, define the request type of an endpoint
export type ApiRequest<T> = ApiToValue<T>;
// For use with msw server, define the response type of an endpoint, optionally with an error response type.
// The string return is for 500 errors that do not return json.
export type ApiResponse<T, E = undefined> = E extends undefined
    ? string | ApiToValue<T>
    : string | ApiToValue<T> | ApiToValue<E>;

function transformValue<V>(value: V): ApiToValue<V> {
    if (Array.isArray(value)) {
        return value.map(transformValue) as ApiToValue<V>;
    }
    if (value instanceof Date) {
        return value.toISOString() as ApiToValue<V>;
    }
    if (value === null || typeof value === 'undefined' || typeof value !== 'object') {
        return value as ApiToValue<V>;
    }
    return transformObject(value) as ApiToValue<V>;
}

function transformObject<T extends object>(obj: T): ApiToSnake<T> {
    return Object.entries(obj).reduce<ApiToSnake<T>>((acc, [k, v]) => {
        acc[toSnake(k) as keyof ApiToSnake<T>] = transformValue(v);
        return acc;
        // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
    }, {} as ApiToSnake<T>);
}

export function apiToSnake<T>(obj: T): ApiToValue<T> {
    return transformValue(obj);
}

export const focusElement = (el: HTMLElement) => {
    act(() => el.focus());
};
