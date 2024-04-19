import {User, UserInput} from '../../types/DBTypes';
import fetchData from '../../functions/fetchData';
import {LoginResponse, UserResponse} from '../../types/MessageTypes';
import userModel from '../models/userModel';
import {MyContext} from '../../types/MyContext';
import {GraphQLError} from 'graphql';

// TODO: create resolvers based on user.graphql
// note: when updating or deleting a user don't send id to the auth server, it will get it from the token. So token needs to be sent with the request to the auth server
// note2: when updating or deleting a user as admin, you need to send user id (dont delete admin btw) and also check if the user is an admin by checking the role from the user object form context

export default {
  Query: {
    users: async (): Promise<User[]> => {
      return userModel.find();
    },
    userById: async (_parent: undefined, args: {id: string}): Promise<User> => {
      const user = await userModel.findById(args.id);
      if (!user) throw new GraphQLError('User not found');
      return user;
    },
    checkToken: async (
      _parent: undefined,
      args: {token: string},
    ): Promise<UserResponse> => {
      const url = process.env.AUTH_URL + '/api/v1/users/token';
      const options = {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + args.token,
        },
      };
      const response: Pick<User, 'id' | 'user_name' | 'email'> =
        await fetchData(url, options);
      return {message: 'Token is valid', user: response};
    },
  },
  Mutation: {
    login: async (
      _parent: undefined,
      args: {credentials: {username: string; password: string}},
    ): Promise<LoginResponse> => {
      const url = process.env.AUTH_URL + 'auth/login';
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: args.credentials.username,
          password: args.credentials.password,
        }),
      };
      const response: LoginResponse = await fetchData(url, options);
      return response;
    },
    register: async (
      _parent: undefined,
      args: {user: UserInput},
    ): Promise<UserResponse> => {
      const url = process.env.AUTH_URL + 'users/';
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args.user),
      };
      const response: UserResponse = await fetchData(url, options);
      return response;
    },
    updateUser: async (
      _parent: undefined,
      args: {user: {user_name: string; email: string; password: string}},
      contextValue: MyContext,
    ): Promise<UserResponse> => {
      if (!contextValue.userdata) throw new GraphQLError('Not authenticated');
      const id = contextValue.userdata.user.id;
      const response = await userModel.findByIdAndUpdate(
        id,
        {
          user_name: args.user.user_name,
          email: args.user.email,
          password: args.user.password,
        },
        {
          new: true,
        },
      );
      if (!response) throw new GraphQLError('User not found');
      const user: Pick<User, 'id' | 'user_name' | 'email'> = {
        email: response.email,
        id: response._id,
        user_name: response.user_name,
      };
      return {message: 'User updated', user};
    },
    updateUserAsAdmin: async (
      _parent: undefined,
      args: {
        id: string;
        user: {user_name: string; email: string; password: string};
      },
      contextValue: MyContext,
    ): Promise<UserResponse> => {
      if (!contextValue.userdata) throw new GraphQLError('Not authenticated');
      if (contextValue.userdata.user.role !== 'admin')
        throw new GraphQLError('Not authorized');
      const response = await userModel.findByIdAndUpdate(
        args.id,
        {
          user_name: args.user.user_name,
          email: args.user.email,
          password: args.user.password,
        },
        {
          new: true,
        },
      );
      if (!response) throw new GraphQLError('User not found');
      const user: Pick<User, 'id' | 'user_name' | 'email'> = {
        email: response.email,
        id: response._id,
        user_name: response.user_name,
      };
      return {message: 'User updated', user};
    },
    deleteUser: async (
      _parent: undefined,
      args: {},
      contextValue: MyContext,
    ): Promise<UserResponse> => {
      if (!contextValue.userdata) throw new GraphQLError('Not authenticated');
      const id = contextValue.userdata.user.id;
      const response = await userModel.findByIdAndDelete(id);
      if (!response) throw new GraphQLError('User not found');
      const user: Pick<User, 'id' | 'user_name' | 'email'> = {
        id: response._id,
        user_name: response.user_name,
        email: response.email,
      };
      return {message: 'User deleted', user};
    },
    deleteUserAsAdmin: async (
      _parent: undefined,
      args: {id: string},
      contextValue: MyContext,
    ): Promise<UserResponse> => {
      if (!contextValue.userdata) throw new GraphQLError('Not authenticated');
      if (contextValue.userdata.user.role !== 'admin')
        throw new GraphQLError('Not authorized');
      const userCheck = await userModel.findById(args.id);
      if (!userCheck) throw new GraphQLError('User not found');
      if (userCheck.role === 'admin')
        throw new GraphQLError('Cannot delete admin');
      const response = await userModel.findByIdAndDelete(args.id);
      if (!response) throw new GraphQLError('User not found');
      const user: Pick<User, 'id' | 'user_name' | 'email'> = {
        id: response._id,
        user_name: response.user_name,
        email: response.email,
      };
      return {message: 'User deleted', user};
    },
  },
};
