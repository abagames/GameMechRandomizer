declare class Keyboard {
	constructor(keyMap);
	isPressed(name: string): boolean;
	consumePressed(name: string): boolean;
}
declare var KeyMap;
