import {GRPCServer} from './lib/grpc-server';

let server = new GRPCServer({
	appFolder:process.cwd()
});
server.start();