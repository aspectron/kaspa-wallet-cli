export const asyncForEach = (fns:Array<Function>, callback:Function)=>{
	let digest=()=>{
		let fn = fns.shift();
		if(!fn)
			return callback();

		fn(()=>setTimeout(digest,0));
	}

	digest();
}