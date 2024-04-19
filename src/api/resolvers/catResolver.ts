import {GraphQLError} from 'graphql';
import catModel from '../models/catModel';
import {Cat, CatResponse} from '../../types/DBTypes';
import {MyContext} from '../../types/MyContext';

// TODO: create resolvers based on cat.graphql
// note: when updating or deleting a cat, you need to check if the user is the owner of the cat
// note2: when updating or deleting a cat as admin, you need to check if the user is an admin by checking the role from the user object
// note3: updating and deleting resolvers should be the same for users and admins. Use if statements to check if the user is the owner or an admin

export default {
  Query: {
    cats: async (): Promise<Cat[]> => {
      const cats = await catModel
        .find()
        .populate('owner', '_id user_name email');
      cats.forEach((cat) => {
        cat.id = cat._id;
        cat.owner.id = cat.owner._id;
      });
      return cats;
    },
    catById: async (_parent: undefined, args: {id: string}): Promise<Cat> => {
      const cat: Cat | null = await catModel
        .findById(args.id)
        .populate('owner', '_id user_name email');
      if (!cat) throw new GraphQLError('Cat not found');
      cat.id = cat._id;
      cat.owner.id = cat.owner._id;
      return cat;
    },
    catsByOwner: async (
      _parent: undefined,
      args: {ownerId: string},
    ): Promise<CatResponse[]> => {
      const cats = await catModel
        .find({owner: args.ownerId})
        .populate('owner', '_id user_name email');
      return cats;
    },
    catsByArea: async (
      _parent: undefined,
      args: {
        topRight: {lat: Number; lng: Number};
        bottomLeft: {lat: Number; lng: Number};
      },
    ): Promise<CatResponse[]> => {
      const topRight = [String(args.topRight.lat), String(args.topRight.lng)];
      const bottomLeft = [
        String(args.bottomLeft.lat),
        String(args.bottomLeft.lng),
      ];
      const cats: Cat[] = await catModel.find({
        location: {
          $geoWithin: {
            $box: [bottomLeft, topRight],
          },
        },
      });
      cats.forEach((cat) => {
        cat.id = cat._id;
        cat.owner.id = cat.owner._id;
      });
      return cats;
    },
  },
  Mutation: {
    createCat: async (
      _parent: undefined,
      args: {
        input: {
          cat_name: String;
          weight: Number;
          owner: String;
          birthdate: Date;
          location: {type: String; coordinates: Number[]};
          filename: String;
        };
      },
      contextValue: MyContext,
    ): Promise<CatResponse> => {
      if (!contextValue.userdata) throw new GraphQLError('Not authenticated');
      args.input.owner = contextValue.userdata.user.id;
      const response = await (
        await catModel.create(args.input)
      ).populate('owner', '_id user_name email');
      const cat: CatResponse = {
        id: response._id,
        cat_name: response.cat_name,
        weight: response.weight,
        owner: {
          email: response.owner.email,
          id: response.owner._id,
          user_name: response.owner.user_name,
        },
        birthdate: response.birthdate,
        location: response.location,
        filename: response.filename,
      };
      if (!cat) throw new GraphQLError('Cat not created');
      return cat;
    },
    updateCat: async (
      _parent: undefined,
      args: {
        id: string;
        input: {
          cat_name: String;
          weight: Number;
          birthdate: Date;
          location: {type: String; coordinates: Number[]};
          filename: String;
        };
      },
      contextValue: MyContext,
    ): Promise<Pick<Cat, 'cat_name' | 'weight' | 'birthdate'>> => {
      if (!contextValue.userdata) throw new GraphQLError('Not authenticated');
      const catInfo: Cat | null = await catModel.findById(args.id);
      if (!catInfo) throw new GraphQLError('Cat not found');
      if (
        catInfo.owner._id !== contextValue.userdata.user.id &&
        contextValue.userdata.user.role !== 'admin'
      ) {
        throw new GraphQLError('Not authorized');
      }
      const cat: Cat | null = await catModel.findByIdAndUpdate(
        args.id,
        {
          birthdate: args.input.birthdate,
          cat_name: args.input.cat_name,
          weight: args.input.weight,
        },
        {
          new: true,
        },
      );
      if (!cat) throw new GraphQLError('Cat not found');
      const updatedInfo: Pick<Cat, 'cat_name' | 'weight' | 'birthdate'> = {
        cat_name: cat.cat_name,
        weight: cat.weight,
        birthdate: cat.birthdate,
      };
      console.log('kat4', updatedInfo);
      return updatedInfo;
    },
    deleteCat: async (
      _parent: undefined,
      args: {id: string},
      contextValue: MyContext,
    ): Promise<Pick<Cat, 'id'>> => {
      if (!contextValue.userdata) throw new GraphQLError('Not authenticated');
      const catInfo: Cat | null = await catModel.findById(args.id);
      if (!catInfo) throw new GraphQLError('Cat not found');
      if (
        catInfo.owner._id !== contextValue.userdata.user.id &&
        contextValue.userdata.user.role !== 'admin'
      ) {
        throw new GraphQLError('Not authorized');
      }
      const response: Cat | null = await catModel.findByIdAndDelete(args.id);
      if (!response) throw new GraphQLError('Cat not found');
      const deleteId: Pick<Cat, 'id'> = {
        id: response._id,
      };
      return deleteId;
    },
  },
};
