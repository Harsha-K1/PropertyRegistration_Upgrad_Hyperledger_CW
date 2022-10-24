'use strict';

const {Contract} = require('fabric-contract-api');

const propertyStatuses = { 
	'requested' : 'REQUESTED',
	'registered' : 'REGISTERED',
	'onSale' : 'ON_SALE'
};

class RegistrarContract extends Contract {

    constructor() {
		super('org.property-registration-network.regnet');
    }    

    async instantiate(ctx) {
		console.log('RegistrarContract Instantiated');
	}
	
	// Initiator: It will be either the user or the registrar. 
	// Use case: This function should be defined to view the current state of any user.
	async viewUser(ctx, name, aadhaarNum) {	

		const userCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.user', [name, aadhaarNum]);
		let dataBuffer = await ctx.stub.getState(userCompositeKey).catch(err => console.log(err));
		if (!dataBuffer.toString()) {
			throw new Error('No user exists with given name & aadhaarNum!');
		} else {
			return JSON.parse(dataBuffer.toString());
		}
	}

	// Initiator: It will be the registrar. 
	// Output: A ‘User’ asset on the ledger will be the output. 
	// Use case: The registrar initiates a transaction to register a new user on the ledger based on the request received. 
	async approveNewUser(ctx, name, aadhaarNum) {

		if(ctx.clientIdentity.mspId != 'registrarMSP'){
			throw new Error('Only authorized entities can invoke this operation!');
		}

		const userCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.user', [name, aadhaarNum]);
		let dataBuffer = await ctx.stub.getState(userCompositeKey).catch(err => console.log(err));
		if (!dataBuffer.toString()) {
			throw new Error('No user exists with given name & aadhaarNum!');
		} else {
			let userData = JSON.parse(dataBuffer.toString());
			userData.upgradCoins = 0;
			userData.state = 'APPROVED';
			userData.updatedBy = ctx.clientIdentity.getID();
			userData.updatedAt = new Date();
			
			await ctx.stub.putState(userCompositeKey, Buffer.from(JSON.stringify(userData)));
			return userData;
		}
	}
	
	// Initiator: It will be either the user or registrar.
	// Use case: This function should be defined in order to view the current state of any property registered on the ledger.
	async viewProperty(ctx, propertyId){

		let propertyCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.property', [propertyId]);
		let dataBuffer = await ctx.stub.getState(propertyCompositeKey).catch(err => console.log(err));
		if (!dataBuffer.toString()) {
			throw new Error('No property exists with given property Id!');
		} 
		return JSON.parse(dataBuffer.toString());
	}

	// Initiator: It will be the registrar.
	// Output: A ‘Property’ asset on the ledger will be the output. 
	// Use case: This function is used by the registrar to create a new ‘Property’ asset on the network after performing certain manual checks on the request received for property registration.
	async approvePropertyRegistration(ctx, propertyId){

		if(ctx.clientIdentity.mspId != 'registrarMSP'){
			throw new Error('Only authorized entities can invoke this operation!');
		}

		let propertyCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.property.request', [propertyId]);
		let dataBuffer = await ctx.stub.getState(propertyCompositeKey).catch(err => console.log(err));
		if (!dataBuffer.toString()) {
			throw new Error('No property exists with given property Id!');
		} else {
			let propertyData = JSON.parse(dataBuffer.toString());
			propertyData.status = propertyStatuses['registered'];
			propertyData.updatedBy = ctx.clientIdentity.getID();	
			propertyData.updatedAt = new Date();

			let propertyKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.property', [propertyId]);
			await ctx.stub.putState(propertyKey, Buffer.from(JSON.stringify(propertyData)));
			return propertyData;
		}
	}
}

module.exports = RegistrarContract;