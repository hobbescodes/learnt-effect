import { afterAll, afterEach, beforeAll } from "bun:test";

import { server } from "./server";

beforeAll(() => server.listen());

afterEach(() => server.resetHandlers());

afterAll(() => server.close());
