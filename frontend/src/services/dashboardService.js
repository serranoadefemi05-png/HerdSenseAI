import api from "../api/api";

export const getAnimals = async () => {
    const res = await api.get("/animals");
    return res.data;
};

export const getAlerts = async () => {
    const res = await api.get("/alerts");
    return res.data;
};

export const getFarms = async () => {
    const res = await api.get("/farms");
    return res.data;
};