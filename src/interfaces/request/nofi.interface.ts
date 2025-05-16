export interface INofiCreate {
    from: string;
    toUser?: string;
    toGroup?: string;
    image?: string;
    title: string;
    content: string;
    seen: boolean;
}
