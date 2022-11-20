import { writable } from "svelte/store";
import { browser } from '$app/environment';

export enum State {
    None,
    Registering,
    Joining,
    Joined,
    Hosting,
};

const stateKey = "ltmstate";
const defaultState = { session: crypto.randomUUID(), state: State.None, avatar: "", room: "" };

let state = writable(defaultState);
if (browser) {
    const jsonState = localStorage.getItem(stateKey);
    if (jsonState) {
        const parsedState = JSON.parse(jsonState);
        state = writable(parsedState);
    }
    state.subscribe((value) => {
        if (value) localStorage.setItem(stateKey, JSON.stringify(value));
        else localStorage.removeItem(stateKey);
    });
}

export { state };