import { expect, it } from "bun:test";

import { ConfigProvider, Effect, Layer, ManagedRuntime } from "effect";

import { PokeApi } from "../services";

const TestConfigProvider = ConfigProvider.fromMap(
	new Map([["BASE_URL", "http://localhost:3000/api/v2"]]),
);

const ConfigProviderLayer = Layer.setConfigProvider(TestConfigProvider);

const MainLayer = PokeApi.Default.pipe(Layer.provide(ConfigProviderLayer));

const TestingRuntime = ManagedRuntime.make(MainLayer);

const program = Effect.gen(function* () {
	const pokeApi = yield* PokeApi;

	return yield* pokeApi.getPokemon;
});

it("returns a valid pokemon", async () => {
	const response = await TestingRuntime.runPromise(program);

	expect(response).toEqual({
		id: 1,
		height: 10,
		weight: 10,
		order: 1,
		name: "myname",
	});
});
