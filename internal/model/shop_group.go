package model

// SkuItem 单个SKU编码
type SkuItem struct {
	SkuCode string
}

// ModelGroup 商品型号分组：型号名称 + 该型号所有SKU
type ModelGroup struct {
	ModelName string    // 型号：V49、V18、有线耳机、收纳袋等
	SkuList   []SkuItem // 该型号对应的全部SKU集合
}

// ShopGroup 店铺分组：店铺名称 + 该店铺下全部型号
type ShopGroup struct {
	ShopName    string       // 店铺名称
	ModelGroups []ModelGroup // 店铺旗下所有型号
}

// shopData 根数据：所有店铺集合
var shopData = []ShopGroup{
	{
		ShopName: "snsy官方", // 自行修改你的真实店铺名
		ModelGroups: []ModelGroup{
			{
				ModelName: "V49",
				SkuList: []SkuItem{
					{SkuCode: "10146509782206"},
					{SkuCode: "10146509782207"},
				},
			},
			{
				ModelName: "V18",
				SkuList: []SkuItem{
					{SkuCode: "10146511108776"},
					{SkuCode: "10146511108778"},
					{SkuCode: "10146511108777"},
				},
			},
			{
				ModelName: "有线耳机",
				SkuList: []SkuItem{
					{SkuCode: "10223577761746"},
					{SkuCode: "10154167865667"},
					{SkuCode: "10223577761745"},
					{SkuCode: "10154167865668"},
				},
			},
			{
				ModelName: "收纳袋",
				SkuList: []SkuItem{
					{SkuCode: "10154168546296"},
					{SkuCode: "10154168546297"},
				},
			},
			{
				ModelName: "Y90",
				SkuList: []SkuItem{
					{SkuCode: "10154167567027"},
					{SkuCode: "10154167567028"},
				},
			},
			{
				ModelName: "新Y90",
				SkuList: []SkuItem{
					{SkuCode: "10224005203700"},
				},
			},
			{
				ModelName: "M149",
				SkuList: []SkuItem{
					{SkuCode: "10214680115733"},
					{SkuCode: "10212790072308"},
				},
			},
			{
				ModelName: "M108",
				SkuList: []SkuItem{
					{SkuCode: "10157619193074"},
					{SkuCode: "10207092304974"},
				},
			},
			{
				ModelName: "A118",
				SkuList: []SkuItem{
					{SkuCode: "10162487130943"},
					{SkuCode: "10162487130942"},
				},
			},
			{
				ModelName: "骨传导X21",
				SkuList: []SkuItem{
					{SkuCode: "10169068433971"},
				},
			},
			{
				ModelName: "骨传导K08",
				SkuList: []SkuItem{
					{SkuCode: "10169067740534"},
				},
			},
			{
				ModelName: "骨传导X13",
				SkuList: []SkuItem{
					{SkuCode: "10169067649366"},
				},
			},
			{
				ModelName: "转接头",
				SkuList: []SkuItem{
					{SkuCode: "10169068178897"},
				},
			},
			{
				ModelName: "V21",
				SkuList: []SkuItem{
					{SkuCode: "10196610586817"},
				},
			},
			{
				ModelName: "M100",
				SkuList: []SkuItem{
					{SkuCode: "10215957155930"},
					{SkuCode: "10215957155931"},
				},
			},
			{
				ModelName: "M185",
				SkuList: []SkuItem{
					{SkuCode: "10221386207120"},
					{SkuCode: "10221386207119"},
				},
			},
		},
	},
	// 新增店铺示例，复制上面结构即可添加第二个店铺
	{
		ShopName: "qain",
		ModelGroups: []ModelGroup{
			{
				ModelName: "四代",
				SkuList: []SkuItem{
					{SkuCode: "10159925656257"},
				},
			},
			{
				ModelName: "五代",
				SkuList: []SkuItem{
					{SkuCode: "10146524927861"},
				},
			},
			{
				ModelName: "六代",
				SkuList:   []SkuItem{},
			},
			{
				ModelName: "pro3",
				SkuList:   []SkuItem{},
			},
			{
				ModelName: "苹果耳机",
				SkuList:   []SkuItem{},
			},
			{
				ModelName: "3.5陶瓷",
				SkuList:   []SkuItem{},
			},
			{
				ModelName: "typec陶瓷",
				SkuList:   []SkuItem{},
			},
			{
				ModelName: "PD1米",
				SkuList: []SkuItem{
					{SkuCode: "10161240860366"},
				},
			},
			{
				ModelName: "PD2米",
				SkuList: []SkuItem{
					{SkuCode: "10161240860367"},
				},
			},
			{
				ModelName: "30W一米套装",
				SkuList: []SkuItem{
					{SkuCode: "10161241102177"},
				},
			},
			{
				ModelName: "30W二米套装",
				SkuList: []SkuItem{
					{SkuCode: "10161241102178"},
				},
			},
			{
				ModelName: "30W充电头",
				SkuList: []SkuItem{
					{SkuCode: "10220673635753"},
				},
			},
			{
				ModelName: "C-C1米",
				SkuList: []SkuItem{
					{SkuCode: "10212953194578"},
					{SkuCode: "10221374584676"},
				},
			},
			{
				ModelName: "C-C2米",
				SkuList: []SkuItem{
					{SkuCode: "10212953194579"},
					{SkuCode: "10221374584677"},
				},
			},
			{
				ModelName: "45W充电头",
				SkuList: []SkuItem{
					{SkuCode: "10161241466678"},
					{SkuCode: "10220673635754"},
				},
			},
			{
				ModelName: "45W一米套装",
				SkuList: []SkuItem{
					{SkuCode: "10161241122053"},
					{SkuCode: "10161241466685"},
				},
			},
			{
				ModelName: "45W二米套装",
				SkuList: []SkuItem{
					{SkuCode: "10161241122054"},
					{SkuCode: "10161241466686"},
				},
			},
		},
	},
}

// GetAllShopGroup 获取全部店铺数据
func GetAllShopGroup() []ShopGroup {
	return shopData
}

// GetAllModelGroup 兼容旧代码，返回平铺所有型号（不区分店铺）
func GetAllModelGroup() []ModelGroup {
	var list []ModelGroup
	for _, shop := range shopData {
		list = append(list, shop.ModelGroups...)
	}
	return list
}

// GetShopAndModelBySku 通过SKU查询对应【店铺名、型号名】
func GetShopAndModelBySku(skuCode string) (shopName string, modelName string) {
	for _, shop := range shopData {
		for _, mg := range shop.ModelGroups {
			for _, sku := range mg.SkuList {
				if sku.SkuCode == skuCode {
					return shop.ShopName, mg.ModelName
				}
			}
		}
	}
	return "", ""
}

// GetModelBySku 兼容旧代码，只返回型号
func GetModelBySku(skuCode string) string {
	_, m := GetShopAndModelBySku(skuCode)
	return m
}
