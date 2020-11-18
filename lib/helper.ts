export const asyncForEach = (fns:Array<Function>, callback:Function)=>{
	let digest=()=>{
		let fn = fns.shift();
		if(!fn)
			return callback();

		fn(()=>setTimeout(digest,0));
	}

	digest();
}

export const log = (label:string, text:string, deco1:string="-", deco2:string="=")=>{
	console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
}