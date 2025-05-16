export interface IUpdateMeReqBody {
    firstName: string;
    lastName: string;
    birthday?: Date;
    level?: string;
    gender?: string;
    avatar?: string;
    learningGoal?: string;
    likedCategories?: string[];
    noticeTimes?: string[];
}

export interface IRefreshReqBody {
  token: string;
}