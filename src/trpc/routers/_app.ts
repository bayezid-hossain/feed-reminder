import { farmersRouter } from '@/modules/farmers/server/procedures';
import { createTRPCRouter } from '../init';
export const appRouter = createTRPCRouter({
    farmers: farmersRouter
});
// export type definition of API
export type AppRouter = typeof appRouter;
