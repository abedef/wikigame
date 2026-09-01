// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Locale } from '$lib/i18n';

declare global {
	namespace App {
		interface Locals {
			/** Settled in hooks.server.ts, before any load runs. */
			locale: Locale;
		}
		interface Platform {
			env?: {
				/**
				 * Present only when the pages are served by the worker, which is to
				 * say in production. `vite dev` has no bindings.
				 */
				ROOM?: import('$lib/server/rooms').RoomNamespace;
			};
		}
	}
}

export {};
