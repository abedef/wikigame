<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes & {
		children: Snippet;
		variant?: 'primary' | 'secondary' | 'quiet';
	};

	let { children, variant = 'primary', class: extra = '', ...rest }: Props = $props();

	const variants = {
		primary: 'bg-accent text-accent-ink hover:brightness-110 border-transparent',
		secondary: 'bg-panel text-ink border-line hover:border-accent',
		quiet:
			'bg-transparent text-muted border-transparent hover:text-ink underline underline-offset-4'
	};
</script>

<button
	{...rest}
	class="focus-visible:outline-accent inline-flex cursor-pointer items-center justify-center
		rounded-xl border px-4 py-2 font-semibold transition
		focus-visible:outline-2 focus-visible:outline-offset-2
		disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100
		{variants[variant]} {extra}"
>
	{@render children()}
</button>
