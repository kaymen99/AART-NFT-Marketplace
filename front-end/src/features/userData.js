import { createSlice } from "@reduxjs/toolkit";

const initialData = {
  account: "",
  balance: 0,
  network: "",
  registred: false,
  username: "",
  profileImg: "",
};
export const userDataSlice = createSlice({
  name: "userData",
  initialState: { value: initialData },
  reducers: {
    updateUserData: (state, action) => {
      state.value = action.payload;
    },
    disconnect: (state) => {
      state.value = initialData;
    },
  },
});

export default userDataSlice.reducer;

export const { updateUserData, disconnect } = userDataSlice.actions;
