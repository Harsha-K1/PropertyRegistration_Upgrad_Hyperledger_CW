'use strict';

const {Contract} = require('fabric-contract-api');

const bankTransactionIds = {
	'upg100' : 100,
	'upg500' : 500,
	'upg1000' : 1000
};

const propertyStatuses = { 
	'requested' : 'REQUESTED',
	'registered' : 'REGISTERED',
	'onSale' : 'ON_SALE'
};


class UserContract extends Contract {

	constructor() {
		super('org.property-registration-network.regnet.usercontract');	
    }    
    async instantiate(ctx) {
		console.log('UserContract Instantiated.');
	}

// 	Initiator: It will be the user. 
// 	Output: A ‘Request’ asset on the ledger will be the output. 
// 	Use case: This transaction is called by the user to request the registrar to register them on the property-registration-network. 
	async requestNewUser(ctx, name, emailId, phoneNum, aadhaarNum) {
		if(ctx.clientIdentity.mspId != 'usersMSP'){
			throw new Error('Only authorized entities can invoke this operation!');
		}

		const userCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.user', [name, aadhaarNum]);
		let dataBuffer = await ctx.stub.getState(userCompositeKey).catch(err => console.log(err));
		if (dataBuffer.toString()) {
			throw new Error('Invalid User Request! A user with this name & aadhaar number already exists!');
		} else {
			let newUserReqObj = {
				name: name,
				emailId: emailId,
				phoneNum:phoneNum,
				aadhaarNum: aadhaarNum,
				state: 'REQUESTED',
				createdAt: new Date(),
				createdBy: ctx.clientIdentity.getID(),
				updatedAt: new Date()
			};
			await ctx.stub.putState(userCompositeKey, Buffer.from(JSON.stringify(newUserReqObj)));
			return newUserReqObj;
		}
	};
	

	// Initiator: It will be the user. 
	// Use case: This transaction is initiated by the user to recharge their account with ‘upgradCoins’.
	async rechargeAccount(ctx, name, aadhaarNum, bankTransactionId) {
		if(ctx.clientIdentity.mspId != 'usersMSP'){
			throw new Error('Only authorized entities can invoke this operation!');
		}

		const userCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.user', [name, aadhaarNum]);
		let dataBuffer = await ctx.stub.getState(userCompositeKey).catch(err => console.log(err));
		if (!dataBuffer.toString()) {
			throw new Error('No user exists with given name & aadhaarNum!');
		}

		if(bankTransactionIds[bankTransactionId]){	
			let userData = JSON.parse(dataBuffer.toString());
			userData.upgradCoins += bankTransactionIds[bankTransactionId];
			await ctx.stub.putState(userCompositeKey, Buffer.from(JSON.stringify(userData)));
			return userData;
		} else {
			throw new Error('No bank transactions found with Id : ' + bankTransactionId);
		}
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

	// 	Initiator: It will be the user. 
	// 	Output: A ‘Request’ asset on the ledger will be the output. 
	// 	Use case: This function should be initiated by the user to register the details of their property on the property-registration-network.
	async propertyRegistrationRequest(ctx, propertyId, price, status, name, aadhaarNum){
		if(ctx.clientIdentity.mspId != 'usersMSP'){
			throw new Error('Only authorized entities can invoke this operation!');
		}

		const userCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.user', [name, aadhaarNum]);
		let userDataBuffer = await ctx.stub.getState(userCompositeKey).catch(err => console.log(err));
		if (!userDataBuffer.toString()) {
			throw new Error('No user exists with given name & aadhaarNum!');
		} 

		let propertyCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.property.request', [propertyId]);
		let propDataBuffer = await ctx.stub.getState(propertyCompositeKey).catch(err => console.log(err));
		if (propDataBuffer.toString()) {
			throw new Error('A property with given Property ID already exists!');
		}

		if(!propertyStatuses[status]){	
			throw new Error('Given value for property status : ' + status + ' is not valid!');
		}

		let newPropertyReqObj = {
			propertyId: propertyId,
			owner: userCompositeKey,
			price: parseFloat(price),
			state: propertyStatuses[status],
			createdBy: ctx.clientIdentity.getID(),
			createdAt: new Date(),
			updatedBy: ctx.clientIdentity.getID(),
			updatedAt: new Date()
		};

		await ctx.stub.putState(propertyCompositeKey, Buffer.from(JSON.stringify(newPropertyReqObj)));
		return newPropertyReqObj;
	}

	// Initiator: It will be either the user or registrar.
	// Use case: This function should be defined in order to view the current state of any property registered on the ledger.
	async viewProperty(ctx,propertyId){
		let propertyCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.property', [propertyId]);
		let dataBuffer = await ctx.stub.getState(propertyCompositeKey).catch(err => console.log(err));
		if (!dataBuffer.toString()) {
			throw new Error('No property exists with given property Id!');
		} 
		return JSON.parse(dataBuffer.toString());
	}

	// Initiator: A registered user who has their property registered on the ledger will be the initiator. 
	// Use case: This function is invoked in order to change the status of a property. 
	async updateProperty(ctx,propertyId,status,name,aadhaarNum){

		if(ctx.clientIdentity.mspId != 'usersMSP'){
			throw new Error('Only authorized entities can invoke this operation!');
		}
		
		let propertyCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.property', [propertyId]);
		let propDataBuffer = await ctx.stub.getState(propertyCompositeKey).catch(err => console.log(err));
		if (!propDataBuffer.toString()) {
			throw new Error('No property exists with given property Id!');
		}

		const userCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.user', [name, aadhaarNum]);
		let userDataBuffer = await ctx.stub.getState(userCompositeKey).catch(err => console.log(err));
		if (!userDataBuffer.toString()) {
			throw new Error('No user exists with given name & aadhaarNum!');
		} 

		if(!propertyStatuses[status]){	
			throw new Error('Given value for property status : ' + status + ' is not valid!');
		}

		let propertyData = JSON.parse(propDataBuffer.toString());
		if(userCompositeKey == propertyData.owner){	
			propertyData.status = propertyStatuses[status];
			propertyData.updatedBy = ctx.clientIdentity.getID();	
			propertyData.updatedAt = new Date();
			await ctx.stub.putState(propertyCompositeKey, Buffer.from(JSON.stringify(propertyData)));
			return propertyData;
		} else {
			throw new Error('Only authorized users can update value of this property!');
		}
	}

	// Initiator: A user registered on the network will be the initiator. 
	// Use case: In this transaction, the properties listed for sale can be purchased by a user registered on the network.
	async purchaseProperty(ctx,propertyId,name,aadhaarNum){
		
		if(ctx.clientIdentity.mspId != 'usersMSP'){
			throw new Error('Only authorized entities can invoke this operation!');
		}

		let propertyCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.property', [propertyId]);
		let propDataBuffer = await ctx.stub.getState(propertyCompositeKey).catch(err => console.log(err));
		if (!propDataBuffer.toString()) {
			throw new Error('No property exists with given property Id!');
		}

		const userCompositeKey = ctx.stub.createCompositeKey('org.property-registration-network.regnet.user', [name, aadhaarNum]);
		let userDataBuffer = await ctx.stub.getState(userCompositeKey).catch(err => console.log(err));
		if (!userDataBuffer.toString()) {
			throw new Error('No user exists with given name & aadhaarNum!');
		} 

		//Check that property is ONSALE at time of purchase.
		let propertyObject = JSON.parse(propDataBuffer.toString());
		if(propertyObject.status != propertyStatuses['onSale']){	
			throw new Error('This property is NOT listed for sale!');
		}

		if(userCompositeKey != propertyObject.owner){

			let userData = JSON.parse(userDataBuffer.toString());
			if(userData.upgradCoins >= propertyObject.price) {
				let ownerDataBuffer = await ctx.stub.getState(userCompositeKey).catch(err => console.log(err));
				let ownerUserData = JSON.parse(ownerDataBuffer.toString());

				//Exchange of funds from BUYER to OWNER.
				userData.upgradCoins = userData.upgradCoins - propertyObject.price;	
				ownerUserData.upgradCoins += propertyObject.price;

				propertyObject.owner = userCompositeKey; //At this point, the user key refers to the BUYER.
				propertyObject.status = propertyStatuses['registered'];
				propertyObject.updatedBy = ctx.clientIdentity.getID();	
				propertyObject.updatedAt = new Date();

				await ctx.stub.putState(userCompositeKey, Buffer.from(JSON.stringify(userData)));
				await ctx.stub.putState(propertyCompositeKey, Buffer.from(JSON.stringify(propertyObject)));
				return propertyObject;
			}
			throw new Error('Not enough funds to purchase desired property!');
		} else {
			throw new Error('Owners cannot purchase their own property.');
		}
	}
}

module.exports = UserContract;