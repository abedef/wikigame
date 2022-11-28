import { writable } from "svelte/store";
import { browser } from '$app/environment';
import { GameStage, State } from "./enums";

const stateKey = "ltmstate";
const defaultState = {
    session: crypto.randomUUID(),
    state: State.None,
    stage: GameStage.Research,
    avatar: "",
    room: "",
    gameConfig: {
        size: 8,
        rounds: 8
    }
};

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