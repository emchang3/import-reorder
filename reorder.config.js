module.exports = {
  commentBegin: /(^\/\/|^\/\*)/,
  defaultGroup: 'Components',
  fileTypes: /(\.js$|\.jsx$|\.ts$|\.tsx$)/,
  groups: {
    Vendor: /(react|mobx|vendor)/,
    Platform: /platform/,
    Toolkit: /toolkit/,
    'Models/Constants/Types': /(models|constants|types)/,
    Stores: /stores/,
    StdLib: /fs/,
    Config: /config/
  },
  ignoreFiles: /config/,
  importPattern: /(import.*from|const.*require)/,
  indentSpaces: 2,
  maxLineLength: 100,
  membersBegin: /(import \{|const \{)/,
  labelGroups: false
};
