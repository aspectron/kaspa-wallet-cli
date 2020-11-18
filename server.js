"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const grpc_server_1 = require("./lib/grpc-server");
let server = new grpc_server_1.GRPCServer();
server.start();
