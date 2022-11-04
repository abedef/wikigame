import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';
import webSocketServer from './src/lib/sockets';

const config: UserConfig = {
	// TODO why is the compiler complaining about this?
	//      Type 'null' is not assignable to type 'Partial<ServerOptions>'
	plugins: [sveltekit(), webSocketServer]
};

export default config;
